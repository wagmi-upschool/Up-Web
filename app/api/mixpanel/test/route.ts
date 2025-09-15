import { NextRequest, NextResponse } from "next/server";
import { getRemoteConfigValue, setRemoteConfigValue, clearConfigCache } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get('action') || 'get';
    
    switch (action) {
      case 'get':
        // Test reading from Remote Config
        console.log("🧪 Testing Firebase Remote Config read");
        const config = await getRemoteConfigValue('UpWebMixpanelDashboard');
        
        return NextResponse.json({
          success: true,
          action: 'get',
          config,
          message: config ? "Configuration retrieved successfully" : "No configuration found"
        });
        
      case 'init':
        // Initialize default configuration
        console.log("🧪 Testing Firebase Remote Config initialization");
        const defaultConfig = {
          "denizbank": {
            "users": [
              "yusuff2403@gmail.com",
              "5d18830e-f1b9-c898-793c-6fa65120c44f"
            ],
            "url": "https://eu.mixpanel.com/project/3422744/view/3926876/app/events"
          }
        };
        
        const success = await setRemoteConfigValue(
          'UpWebMixpanelDashboard', 
          defaultConfig, 
          'Mixpanel dashboard URLs and user access configuration for Up Web'
        );
        
        if (success) {
          // Clear cache to force fresh read
          clearConfigCache('UpWebMixpanelDashboard');
        }
        
        return NextResponse.json({
          success,
          action: 'init',
          message: success 
            ? "Default configuration created successfully" 
            : "Failed to create default configuration",
          config: success ? defaultConfig : null
        });
        
      case 'clear-cache':
        // Clear cache for testing
        console.log("🧪 Clearing Firebase Remote Config cache");
        clearConfigCache('UpWebMixpanelDashboard');
        
        return NextResponse.json({
          success: true,
          action: 'clear-cache',
          message: "Cache cleared successfully"
        });
        
      case 'test-flow':
        // Test the complete flow
        console.log("🧪 Testing complete Remote Config flow");
        
        // Step 1: Clear cache
        clearConfigCache('UpWebMixpanelDashboard');
        
        // Step 2: Try to read config
        const currentConfig = await getRemoteConfigValue('UpWebMixpanelDashboard');
        
        // Step 3: If no config, create default
        let finalConfig = currentConfig;
        if (!currentConfig) {
          const testConfig = {
            "test-org": {
              "users": [
                "test@example.com"
              ],
              "url": "https://eu.mixpanel.com/project/test/view/test/app/events"
            }
          };
          
          const created = await setRemoteConfigValue(
            'UpWebMixpanelDashboard', 
            testConfig, 
            'Test configuration for Up Web Mixpanel integration'
          );
          
          if (created) {
            clearConfigCache('UpWebMixpanelDashboard');
            finalConfig = await getRemoteConfigValue('UpWebMixpanelDashboard');
          }
        }
        
        return NextResponse.json({
          success: true,
          action: 'test-flow',
          steps: {
            cache_cleared: true,
            config_exists: !!currentConfig,
            final_config: finalConfig
          },
          message: "Complete flow test completed"
        });
        
      default:
        return NextResponse.json(
          { error: "Invalid action. Use: get, init, clear-cache, or test-flow" },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error("❌ Firebase Remote Config test error:", error);
    return NextResponse.json(
      { 
        error: "Test failed", 
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config } = body;
    
    if (!config) {
      return NextResponse.json(
        { error: "Configuration object is required in request body" },
        { status: 400 }
      );
    }
    
    console.log("🧪 Testing Firebase Remote Config write with custom config");
    
    const success = await setRemoteConfigValue(
      'UpWebMixpanelDashboard', 
      config, 
      'Custom test configuration for Up Web Mixpanel integration'
    );
    
    if (success) {
      clearConfigCache('UpWebMixpanelDashboard');
    }
    
    return NextResponse.json({
      success,
      message: success 
        ? "Custom configuration saved successfully" 
        : "Failed to save custom configuration",
      config: success ? config : null
    });
    
  } catch (error) {
    console.error("❌ Firebase Remote Config write test error:", error);
    return NextResponse.json(
      { 
        error: "Write test failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}