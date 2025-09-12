
// Enhanced API utility with comprehensive error handling
export async function apiCall(
  method: string,
  url: string,
  data?: any
): Promise<any> {
  try {
    console.log(`API Call: ${method} ${url}`, data ? { data } : '');

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    };

    if (data && method !== 'GET') {
      try {
        config.body = JSON.stringify(data);
      } catch (jsonError) {
        console.error('Error stringifying request data:', jsonError);
        throw new Error('Invalid request data format');
      }
    }

    const response = await fetch(url, config);
    console.log(`API Response: ${method} ${url} - Status: ${response.status}`);
    
    // Get response text first
    const responseText = await response.text();
    console.log(`API Response Text: ${method} ${url}`, responseText);
    
    let responseData;
    
    // Check if response looks like JSON
    if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
        console.log(`API Parsed Data: ${method} ${url}`, responseData);
      } catch (parseError) {
        console.error('JSON Parse Error:', {
          url,
          method,
          responseText,
          parseError: parseError.message,
          stack: parseError.stack
        });
        responseData = { 
          message: 'Server returned invalid JSON',
          originalResponse: responseText 
        };
      }
    } else if (responseText === '') {
      responseData = {};
    } else {
      // Plain text response
      responseData = { message: responseText };
    }

    if (!response.ok) {
      const errorMessage = responseData?.message || `HTTP ${response.status}: ${response.statusText}`;
      console.error('API Error:', { url, method, status: response.status, message: errorMessage });
      throw new Error(errorMessage);
    }

    return responseData;
  } catch (error) {
    console.error('API Call Failed:', { method, url, error: error.message });
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection.');
    }
    
    // Re-throw the error with more context
    if (error.message) {
      throw error;
    }
    
    throw new Error('Unknown API error occurred');
  }
}
