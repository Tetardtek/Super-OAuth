import { User } from '../../../src/domain/entities/user.entity';
import { Email } from '../../../src/domain/value-objects/email.vo';
import { Nickname } from '../../../src/domain/value-objects/nickname.vo';
import { Password } from '../../../src/domain/value-objects/password.vo';
import { LinkedAccount } from '../../../src/domain/entities/linked-account';
import { UserId } from '../../../src/domain/value-objects/user-id';

// Les tests domain n'utilisent aucun mock — règle DDD :
// la logique métier doit être testable sans dépendance externe.

function makeLinkedAccount(provider: 'google' | 'github' | 'discord' = 'google'): LinkedAccount {
  return LinkedAccount.create({
    userId: UserId.generate(),
    provider,
    providerId: `${provider}-id-123`,
    displayName: 'Test User',
    email: 'test@example.com',
  });
}

describe('User Entity', () => {
  describe('createWithEmail', () => {
    it('should create a user with correct initial state', () => {
      const user = User.createWithEmail(
        'user-id-1',
        Email.create('alice@example.com'),
        Nickname.create('alice'),
        Password.create('Secure123!')
      );

      expect(user.id).toBe('user-id-1');
      expect(user.email?.toString()).toBe('alice@example.com');
      expect(user.nickname.toString()).toBe('alice');
      expect(user.isActive).toBe(true);
      expect(user.loginCount).toBe(0);
      expect(user.lastLogin).toBeNull();
    });

    it('should set emailVerified to false — email not confirmed yet', () => {
      const user = User.createWithEmail(
        'id',
        Email.create('bob@example.com'),
        Nickname.create('bob'),
        Password.create('Secure123!')
      );

      expect(user.emailVerified).toBe(false);
    });

    it('should store a hashed password, not plaintext', () => {
      const plain = 'Secure123!';
      const user = User.createWithEmail(
        'id',
        Email.create('carol@example.com'),
        Nickname.create('carol'),
        Password.create(plain)
      );

      // getPasswordHash() existe pour la couche persistance uniquement
      expect(user.getPasswordHash()).not.toBe(plain);
      expect(user.getPasswordHash()).toBeTruthy();
      expect(user.hasPassword).toBe(true);
    });

    it('should start with no linked providers', () => {
      const user = User.createWithEmail(
        'id',
        Email.create('dave@example.com'),
        Nickname.create('dave'),
        Password.create('Secure123!')
      );

      expect(user.linkedProviders).toEqual([]);
    });
  });

  describe('createWithProvider', () => {
    it('should create a user with a linked OAuth account and no password', () => {
      const account = makeLinkedAccount('github');
      const user = User.createWithProvider(
        'oauth-id',
        Nickname.create('oauthuser'),
        account,
        Email.create('oauth@example.com')
      );

      expect(user.hasPassword).toBe(false);
      expect(user.getPasswordHash()).toBeNull();
      expect(user.linkedProviders).toContain('github');
      expect(user.isActive).toBe(true);
    });

    it('should set emailVerified=true when email is provided by trusted OAuth provider', () => {
      const user = User.createWithProvider(
        'id',
        Nickname.create('user'),
        makeLinkedAccount('google'),
        Email.create('verified@example.com')
      );

      expect(user.emailVerified).toBe(true);
    });

    it('should set emailVerified=false and email=null when no email provided', () => {
      const user = User.createWithProvider(
        'id',
        Nickname.create('anon'),
        makeLinkedAccount('discord')
        // pas d'email
      );

      expect(user.email).toBeNull();
      expect(user.emailVerified).toBe(false);
    });
  });

  describe('reconstruct', () => {
    it('should reconstruct a user from raw database data', () => {
      const createdAt = new Date('2025-01-01');
      const lastLogin = new Date('2025-06-01');

      const user = User.reconstruct(
        'db-id-999',
        'reconstruct@example.com',
        'recon',
        'hashed_password',
        true,
        true,
        createdAt,
        createdAt,
        lastLogin,
        42
      );

      expect(user.id).toBe('db-id-999');
      expect(user.email?.toString()).toBe('reconstruct@example.com');
      expect(user.nickname.toString()).toBe('recon');
      expect(user.emailVerified).toBe(true);
      expect(user.loginCount).toBe(42);
      expect(user.lastLogin).toBe(lastLogin);
    });

    it('should handle null email from database', () => {
      const user = User.reconstruct('id', null, 'user', null, false, true, new Date(), new Date(), null, 0);

      expect(user.email).toBeNull();
    });
  });

  describe('linkAccount', () => {
    it('should link a new OAuth provider', () => {
      const user = User.createWithEmail(
        'id',
        Email.create('link@example.com'),
        Nickname.create('linkuser'),
        Password.create('Secure123!')
      );

      user.linkAccount(makeLinkedAccount('github'));

      expect(user.linkedProviders).toContain('github');
      expect(user.isProviderLinked('github')).toBe(true);
    });

    it('should throw if provider is already linked', () => {
      const user = User.createWithProvider('id', Nickname.create('us'), makeLinkedAccount('google'));

      expect(() => user.linkAccount(makeLinkedAccount('google'))).toThrow(
        'google account already linked'
      );
    });

    it('should throw if more than 5 providers are linked', () => {
      const user = User.createWithProvider('id', Nickname.create('us'), makeLinkedAccount('google'));
      user.linkAccount(makeLinkedAccount('github'));
      user.linkAccount(makeLinkedAccount('discord'));

      // 3 providers liés. On crée 2 faux providers via reconstruct pour atteindre 5.
      const userAt5 = User.reconstruct(
        'id', null, 'us', null, false, true, new Date(), new Date(), null, 0,
        [
          makeLinkedAccount('google'),
          makeLinkedAccount('github'),
          makeLinkedAccount('discord'),
          makeLinkedAccount('google'), // même provider différent objet — on teste juste le comptage
          makeLinkedAccount('github'),
        ]
      );

      expect(() => userAt5.linkAccount(makeLinkedAccount('discord'))).toThrow(
        'Maximum 5 linked accounts allowed'
      );
    });
  });

  describe('verifyPassword', () => {
    it('should return true for the correct password', () => {
      const user = User.createWithEmail(
        'id',
        Email.create('pw@example.com'),
        Nickname.create('pwuser'),
        Password.create('Correct123!')
      );

      expect(user.verifyPassword('Correct123!')).toBe(true);
    });

    it('should return false for a wrong password', () => {
      const user = User.createWithEmail(
        'id',
        Email.create('pw@example.com'),
        Nickname.create('pwuser'),
        Password.create('Correct123!')
      );

      expect(user.verifyPassword('WrongPassword!')).toBe(false);
    });

    it('should return false for OAuth-only users with no password', () => {
      const user = User.createWithProvider(
        'id',
        Nickname.create('oauthonly'),
        makeLinkedAccount('google')
      );

      expect(user.verifyPassword('anything')).toBe(false);
    });
  });

  describe('recordLogin', () => {
    it('should increment loginCount and set lastLogin', () => {
      const user = User.createWithEmail(
        'id',
        Email.create('login@example.com'),
        Nickname.create('loginuser'),
        Password.create('Secure123!')
      );

      expect(user.loginCount).toBe(0);
      expect(user.lastLogin).toBeNull();

      user.recordLogin();

      expect(user.loginCount).toBe(1);
      expect(user.lastLogin).toBeInstanceOf(Date);

      user.recordLogin();
      expect(user.loginCount).toBe(2);
    });
  });

  describe('deactivate', () => {
    it('should set isActive to false', () => {
      const user = User.createWithEmail(
        'id',
        Email.create('deactivate@example.com'),
        Nickname.create('deactivate'),
        Password.create('Secure123!')
      );

      expect(user.isActive).toBe(true);
      user.deactivate('Policy violation');
      expect(user.isActive).toBe(false);
    });
  });

  describe('canUnlinkProvider', () => {
    it('should return true when multiple providers are linked', () => {
      const user = User.createWithProvider('id', Nickname.create('us'), makeLinkedAccount('google'));
      user.linkAccount(makeLinkedAccount('github'));

      expect(user.canUnlinkProvider('google')).toBe(true);
    });

    it('should return false when unlinking the last provider without email or password', () => {
      const user = User.createWithProvider(
        'id',
        Nickname.create('us'),
        makeLinkedAccount('google')
        // pas d'email → emailVerified=false, pas de password
      );

      expect(user.canUnlinkProvider('google')).toBe(false);
    });

    it('should return true when unlinking the last provider but user has a password', () => {
      const user = User.reconstruct(
        'id', 'email@example.com', 'us', 'hashed', true, true,
        new Date(), new Date(), null, 0,
        [makeLinkedAccount('google')]
      );

      expect(user.canUnlinkProvider('google')).toBe(true);
    });
  });
});
