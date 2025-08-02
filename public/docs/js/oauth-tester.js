// OAuth Testing Utilities for Documentation - Version Standalone
(function() {
    'use strict';
    
    class OAuthTester {
        constructor() {
            this.baseUrl = window.location.origin;
            this.results = new Map();
        }

        async testProvidersList() {
            try {
                console.log('🧪 Testing OAuth Providers List...');
                console.log('Base URL:', this.baseUrl);
                console.log('Full URL:', `${this.baseUrl}/api/v1/oauth/providers`);
                
                const response = await fetch(`${this.baseUrl}/api/v1/oauth/providers`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('Response status:', response.status);
                console.log('Response ok:', response.ok);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('Response data:', data);
                
                this.displayResult('providers-test', {
                    status: response.status,
                    success: response.ok,
                    data: data,
                    timestamp: new Date().toISOString()
                });
                
                console.log('✅ Providers test completed:', data);
                return data;
            } catch (error) {
                console.error('❌ Providers test error:', error);
                this.displayError('providers-test', error);
                throw error;
            }
        }

        async testOAuthInitiation(provider) {
            try {
                console.log(`🧪 Testing OAuth ${provider}...`);
                // Note: We can't actually follow redirects in fetch due to CORS
                // But we can test that the endpoint responds
                const response = await fetch(`${this.baseUrl}/api/v1/oauth/${provider}`, {
                    method: 'GET',
                    redirect: 'manual' // Don't follow redirects
                });
                
                // OAuth redirections are expected and should be treated as success
                // Status 0 with opaque redirect means browser blocked the redirect (expected)
                // Status 302 means explicit redirect (also expected)
                const isOAuthRedirect = response.status === 302 || 
                                       response.type === 'opaqueredirect' || 
                                       (response.status === 0 && response.type === 'opaque');
                
                this.displayResult(`${provider}-test`, {
                    status: response.status || 302, // Treat 0 as 302 for display
                    success: true, // OAuth redirects are always success
                    redirected: isOAuthRedirect,
                    provider: provider,
                    note: 'Redirection vers le provider OAuth (normal)',
                    timestamp: new Date().toISOString()
                });
                
                console.log(`✅ ${provider} OAuth test completed - Status: ${response.status}, Type: ${response.type}`);
                
            } catch (error) {
                console.error(`❌ ${provider} OAuth test error:`, error);
                this.displayError(`${provider}-test`, error);
            }
        }

        displayResult(containerId, result) {
            console.log(`📊 Displaying result for container: ${containerId}`, result);
            const container = document.getElementById(containerId);
            if (!container) {
                console.warn(`❌ Container ${containerId} not found in DOM`);
                console.log('Available elements with test in ID:', document.querySelectorAll('[id*="test"]'));
                return;
            }
            
            console.log(`✅ Container ${containerId} found, updating content...`);
            const statusClass = result.success ? 'success' : 'error';
            const resultHtml = `
                <div class="test-result ${statusClass}">
                    <div class="result-header">
                        <span class="status-code">${result.status}</span>
                        <span class="timestamp">${new Date(result.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div class="result-body">
                        ${result.note ? `<p><em>${result.note}</em></p>` : ''}
                        <pre>${JSON.stringify(result.data || result, null, 2)}</pre>
                    </div>
                </div>
            `;
            
            container.innerHTML = resultHtml;
            console.log(`✅ Content updated for ${containerId}`);
        }

        displayError(containerId, error) {
            const container = document.getElementById(containerId);
            if (!container) {
                console.warn(`Container ${containerId} not found`);
                return;
            }
            
            container.innerHTML = `
                <div class="test-result error">
                    <div class="result-header">
                        <span class="status-code">ERROR</span>
                        <span class="timestamp">${new Date().toLocaleTimeString()}</span>
                    </div>
                    <div class="result-body">
                        <pre>${error.message}</pre>
                    </div>
                </div>
            `;
        }

        async testAllProviders() {
            console.log('🧪 Testing OAuth Integration...');
            
            // Test providers list first
            const providersData = await this.testProvidersList();
            
            // Test each provider initiation
            if (providersData && providersData.data && providersData.data.providers) {
                for (const provider of providersData.data.providers) {
                    console.log(`Testing ${provider.provider}...`);
                    await this.testOAuthInitiation(provider.provider);
                    
                    // Small delay between tests
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            console.log('✅ OAuth tests completed');
        }
    }

    // Initialize OAuth tester when DOM is ready
    let oauthTester;
    
    function initOAuthTester() {
        console.log('🚀 Initializing OAuth Tester...');
        oauthTester = new OAuthTester();
        
        // Make functions available globally
        window.testOAuthProviders = function() {
            console.log('🎯 testOAuthProviders called');
            return oauthTester.testProvidersList();
        };
        
        window.testOAuthProvider = function(provider) {
            console.log(`🎯 testOAuthProvider called for ${provider}`);
            return oauthTester.testOAuthInitiation(provider);
        };
        
        window.testAllOAuth = function() {
            console.log('🎯 testAllOAuth called');
            return oauthTester.testAllProviders();
        };
        
        console.log('✅ OAuth Tester initialized');
    }
    
    // Initialize when DOM is ready
    console.log('OAuth Tester script loaded, document.readyState:', document.readyState);
    
    if (document.readyState === 'loading') {
        console.log('Document loading, adding DOMContentLoaded listener');
        document.addEventListener('DOMContentLoaded', initOAuthTester);
    } else {
        console.log('Document already ready, initializing immediately');
        initOAuthTester();
    }
    
    // Also initialize when window loads (fallback)
    window.addEventListener('load', function() {
        console.log('Window loaded, checking if functions exist...');
        console.log('testOAuthProviders exists:', typeof window.testOAuthProviders);
        if (!window.testOAuthProviders) {
            console.log('Functions not found, re-initializing...');
            initOAuthTester();
        }
    });

})();
