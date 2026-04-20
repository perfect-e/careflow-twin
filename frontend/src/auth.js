const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

export async function login(username, password) {
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);

  const response = await fetch(`${API_BASE_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const data = await response.json();
  localStorage.setItem('token', data.access_token);
  localStorage.setItem('role', data.role);
  localStorage.setItem('username', username);
  return data;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('username');
}

export function getUserRole() {
  return localStorage.getItem('role') || null;
}

export function getToken() {
  return localStorage.getItem('token');
}

export function isAuthenticated() {
  return !!localStorage.getItem('token');
}