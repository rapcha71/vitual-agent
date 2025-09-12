
// Simple API utility with proper error handling
export async function apiCall(
  method: string,
  url: string,
  data?: any
): Promise<any> {
  try {
    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    };

    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(url, config);
    
    // Handle non-JSON responses gracefully
    const contentType = response.headers.get('content-type');
    let responseData;
    
    if (contentType && contentType.includes('application/json')) {
      const text = await response.text();
      try {
        responseData = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.warn('Failed to parse JSON response:', text);
        responseData = { message: 'Invalid server response' };
      }
    } else {
      responseData = { message: await response.text() };
    }

    if (!response.ok) {
      throw new Error(responseData.message || `HTTP ${response.status}`);
    }

    return responseData;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
}
