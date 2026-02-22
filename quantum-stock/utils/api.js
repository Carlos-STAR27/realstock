export function getAuthHeaders(session) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (session?.user?.backendToken) {
    headers['Authorization'] = `Bearer ${session.user.backendToken}`;
  }
  
  return headers;
}

export async function fetchWithAuth(url, options, session) {
  const headers = getAuthHeaders(session);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });
  
  return response;
}
