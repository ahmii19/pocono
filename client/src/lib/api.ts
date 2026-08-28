const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api/v1';

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  const config: RequestInit = {
    next: { revalidate: 0 },
    ...options,
    headers
  };

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data.error || 'An API error occurred');
  }

  return data as T;
}

// 1. Taxonomies (Public - Cached in memory to prevent duplicate requests)
let cachedCities: { data: any[] } | null = null;
let cachedCommunities: { data: any[] } | null = null;
let cachedPropertyTypes: { data: any[] } | null = null;
let cachedAmenities: { data: any[] } | null = null;
let cachedFacilities: { data: any[] } | null = null;

export function clearTaxonomyCache() {
  cachedCities = null;
  cachedCommunities = null;
  cachedPropertyTypes = null;
  cachedAmenities = null;
  cachedFacilities = null;
}

export async function getCities() {
  if (cachedCities) return cachedCities;
  const res = await fetchApi<{ data: any[] }>('/cities');
  if (res && res.data) cachedCities = res;
  return res;
}

export async function getCommunities() {
  if (cachedCommunities) return cachedCommunities;
  const res = await fetchApi<{ data: any[] }>('/communities');
  if (res && res.data) cachedCommunities = res;
  return res;
}

export async function getPropertyTypes() {
  if (cachedPropertyTypes) return cachedPropertyTypes;
  const res = await fetchApi<{ data: any[] }>('/property-types');
  if (res && res.data) cachedPropertyTypes = res;
  return res;
}

export async function getAmenities() {
  if (cachedAmenities) return cachedAmenities;
  const res = await fetchApi<{ data: any[] }>('/amenities');
  if (res && res.data) cachedAmenities = res;
  return res;
}

export async function getFacilities() {
  if (cachedFacilities) return cachedFacilities;
  const res = await fetchApi<{ data: any[] }>('/facilities');
  if (res && res.data) cachedFacilities = res;
  return res;
}

// 2. Properties
export async function getProperties(params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val));
    }
  });
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return fetchApi<{ total: number; page: number; totalPages: number; data: any[] }>(`/properties${queryString}`);
}

export async function getPropertyBySlug(slug: string) {
  return fetchApi<{ data: any }>(`/properties/slug/${slug}`);
}

export async function getPropertyById(id: string) {
  return fetchApi<{ data: any }>(`/properties/${id}`);
}

export async function createProperty(data: any, token: string) {
  return fetchApi<{ data: any }>('/properties', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export async function updateProperty(propertyId: string, data: any, token: string) {
  return fetchApi<{ data: any }>(`/properties/${propertyId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export async function deleteProperty(propertyId: string, token: string, mode: 'soft' | 'permanent' = 'soft') {
  return fetchApi<{ success: boolean; message: string; deleteMode: string }>(`/properties/${propertyId}?deleteMode=${mode}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ deleteMode: mode })
  });
}

// 3. Media Management Endpoints
export async function getPropertyMedia(propertyId: string) {
  return fetchApi<{ property: any; imageCount: number; images: any[] }>(`/properties/${propertyId}/media`);
}

export async function getAllAdminMedia(params: Record<string, any> = {}, token: string) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val));
    }
  });
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return fetchApi<{ total: number; page: number; totalPages: number; data: any[] }>(`/admin/media${queryString}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function uploadPropertyImage(propertyId: string, filePayload: any, token: string) {
  return fetchApi<{ data: any }>(`/properties/${propertyId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(filePayload)
  });
}

export async function setPrimaryImage(propertyId: string, imageId: number | string, token: string) {
  return fetchApi<{ data: any }>(`/properties/${propertyId}/media/${imageId}/primary`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function reorderPropertyImages(propertyId: string, orders: any[], token: string) {
  return fetchApi<{ message: string }>(`/properties/${propertyId}/media/reorder`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ orders })
  });
}

export async function deletePropertyImage(propertyId: string, imageId: number | string, token: string) {
  return fetchApi<{ message: string }>(`/properties/${propertyId}/media/${imageId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// 4. Availability & Reservations
export async function checkAvailability(data: {
  propertyId: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  selectedExtraPrices?: number[];
}) {
  return fetchApi<{ data: any }>('/reservations/check', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function createReservation(data: any, token: string) {
  return fetchApi<{ data: any }>('/reservations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export async function getMyReservations(token: string) {
  return fetchApi<{ data: any[] }>('/reservations/my', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function deleteGuestReservation(id: string, token: string) {
  return fetchApi<{ success: boolean; message: string }>(`/reservations/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// 5. Auth
export async function loginUser(email: string, password: string, intent?: string) {
  return fetchApi<{ user: any; token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, intent })
  });
}

export async function registerUser(data: any, intent?: string) {
  return fetchApi<{ user: any; token: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...data, intent: intent || data.intent })
  });
}

export async function getCurrentUser(token: string) {
  return fetchApi<{ user: any }>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

// 6. Reviews (Public)
export async function getPropertyReviews(propertyId: string) {
  return fetchApi<{ data: any[] }>(`/properties/${propertyId}/reviews`);
}

export async function createReview(data: any, token: string) {
  return fetchApi<{ data: any }>('/reviews', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

// 7. Favorites
export async function getFavorites(token: string) {
  return fetchApi<{ data: any[] }>('/favorites', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function addFavorite(propertyId: string, token: string) {
  return fetchApi<{ data: any }>('/favorites', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ propertyId })
  });
}

export async function removeFavorite(propertyId: string, token: string) {
  return fetchApi<{ message: string }>(`/favorites/${propertyId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// 8. Messages & Invoices
export async function getMyThreads(token: string) {
  return fetchApi<{ data: any[] }>('/messages/threads', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function sendMessage(data: any, token: string) {
  return fetchApi<{ data: any }>('/messages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export async function getMyInvoices(token: string) {
  return fetchApi<{ data: any[] }>('/invoices/my', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getInvoiceByReservation(reservationId: string, token: string) {
  return fetchApi<{ data: any }>(`/invoices/reservation/${reservationId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getInvoiceById(invoiceId: string, token: string) {
  return fetchApi<{ data: any }>(`/invoices/${invoiceId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getMembershipPlans() {
  return fetchApi<{ data: any[] }>('/memberships/plans');
}


// 9. Admin Endpoints
export async function getAdminStats(token: string) {
  return fetchApi<{ data: any }>('/admin/stats', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getAdminUsers(token: string, params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val));
    }
  });
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return fetchApi<{ count: number; data: any[] }>(`/admin/users${queryString}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getAdminUserById(userId: string, token: string) {
  return fetchApi<{ data: any }>(`/admin/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function updateAdminUserProfile(userId: string, data: any, token: string) {
  return fetchApi<{ data: any }>(`/admin/users/${userId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export async function updateUserRole(userId: string, role: string, token: string) {
  return fetchApi<{ data: any }>(`/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ role })
  });
}

export async function deleteAdminUser(userId: string, token: string) {
  return fetchApi<{ message: string }>(`/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getAdminReservations(token: string, params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val));
    }
  });
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return fetchApi<{ total: number; metrics: any; data: any[] }>(`/admin/reservations${queryString}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getAdminReservationById(id: string, token: string) {
  return fetchApi<{ data: any }>(`/admin/reservations/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function updateAdminReservationStatus(id: string, status: string, token: string) {
  return fetchApi<{ data: any }>(`/admin/reservations/${id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status })
  });
}

// Reviews Admin (9F)
export async function getAdminReviews(token: string, params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val));
    }
  });
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return fetchApi<{ total: number; data: any[] }>(`/admin/reviews${queryString}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getAdminReviewById(id: string | number, token: string) {
  return fetchApi<{ data: any }>(`/admin/reviews/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function deleteAdminReview(id: string | number, token: string) {
  return fetchApi<{ message: string }>(`/admin/reviews/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Cities Admin (9G)
export async function getAdminCities(token: string, params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val));
    }
  });
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return fetchApi<{ count: number; data: any[] }>(`/admin/cities${queryString}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getAdminCityById(id: string | number, token: string) {
  return fetchApi<{ data: any }>(`/admin/cities/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function createAdminCity(data: any, token: string) {
  return fetchApi<{ data: any }>('/admin/cities', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export async function updateAdminCity(id: string | number, data: any, token: string) {
  return fetchApi<{ data: any }>(`/admin/cities/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export async function deleteAdminCity(id: string | number, token: string) {
  return fetchApi<{ message: string }>(`/admin/cities/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Communities Admin (9H)
export async function getAdminCommunities(token: string, params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val));
    }
  });
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return fetchApi<{ count: number; data: any[] }>(`/admin/communities${queryString}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getAdminCommunityById(id: string | number, token: string) {
  return fetchApi<{ data: any }>(`/admin/communities/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function createAdminCommunity(data: any, token: string) {
  return fetchApi<{ data: any }>('/admin/communities', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export async function updateAdminCommunity(id: string | number, data: any, token: string) {
  return fetchApi<{ data: any }>(`/admin/communities/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export async function deleteAdminCommunity(id: string | number, token: string) {
  return fetchApi<{ message: string }>(`/admin/communities/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Property Types Admin (9I)
export async function getAdminPropertyTypes(token: string, params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val));
    }
  });
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return fetchApi<{ count: number; data: any[] }>(`/admin/property-types${queryString}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getAdminPropertyTypeById(id: string | number, token: string) {
  return fetchApi<{ data: any }>(`/admin/property-types/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function createAdminPropertyType(data: any, token: string) {
  return fetchApi<{ data: any }>('/admin/property-types', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export async function updateAdminPropertyType(id: string | number, data: any, token: string) {
  return fetchApi<{ data: any }>(`/admin/property-types/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export async function deleteAdminPropertyType(id: string | number, token: string) {
  return fetchApi<{ message: string }>(`/admin/property-types/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Amenities Admin (9J)
export async function getAdminAmenities(token: string, params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val));
    }
  });
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return fetchApi<{ count: number; data: any[] }>(`/admin/amenities${queryString}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getAdminAmenityById(id: string | number, token: string) {
  return fetchApi<{ data: any }>(`/admin/amenities/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function createAdminAmenity(data: any, token: string) {
  return fetchApi<{ data: any }>('/admin/amenities', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export async function updateAdminAmenity(id: string | number, data: any, token: string) {
  return fetchApi<{ data: any }>(`/admin/amenities/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export async function deleteAdminAmenity(id: string | number, token: string) {
  return fetchApi<{ message: string }>(`/admin/amenities/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Facilities Admin (9J)
export async function getAdminFacilities(token: string, params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val));
    }
  });
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return fetchApi<{ count: number; data: any[] }>(`/admin/facilities${queryString}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getAdminFacilityById(id: string | number, token: string) {
  return fetchApi<{ data: any }>(`/admin/facilities/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function createAdminFacility(data: any, token: string) {
  return fetchApi<{ data: any }>('/admin/facilities', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export async function updateAdminFacility(id: string | number, data: any, token: string) {
  return fetchApi<{ data: any }>(`/admin/facilities/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export async function deleteAdminFacility(id: string | number, token: string) {
  return fetchApi<{ message: string }>(`/admin/facilities/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Invoices Admin (9K)
export async function getAdminInvoices(token: string, params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val));
    }
  });
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return fetchApi<{ total: number; metrics: any; data: any[] }>(`/admin/invoices${queryString}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getAdminInvoiceById(id: string, token: string) {
  return fetchApi<{ data: any }>(`/admin/invoices/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function deleteAdminInvoice(id: string, token: string) {
  return fetchApi<{ message: string }>(`/admin/invoices/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Messages Admin (9L)
export async function getAdminMessageThreads(token: string, params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val));
    }
  });
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return fetchApi<{ total: number; metrics: any; data: any[] }>(`/admin/messages${queryString}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Full Admin Property Management Client API
export async function getAdminProperties(token: string, params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val));
    }
  });
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return fetchApi<{ total: number; page: number; totalPages: number; data: any[] }>(`/admin/properties${queryString}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getAdminPropertyById(id: string, token: string) {
  return fetchApi<{ data: any }>(`/admin/properties/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function createAdminProperty(data: any, token: string) {
  return fetchApi<{ message: string; data: any }>('/admin/properties', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export async function updateAdminProperty(id: string, data: any, token: string) {
  return fetchApi<{ message: string; data: any }>(`/admin/properties/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export async function updateAdminPropertyStatus(id: string, status: string, token: string) {
  return fetchApi<{ message: string; data: any }>(`/admin/properties/${id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status })
  });
}

export async function updateAdminPropertyFeatured(id: string, isFeatured: boolean, token: string) {
  return fetchApi<{ message: string; data: any }>(`/admin/properties/${id}/featured`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ isFeatured })
  });
}

export async function updateAdminPropertyOwner(id: string, hostId: string, token: string) {
  return fetchApi<{ message: string; data: any }>(`/admin/properties/${id}/owner`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ hostId })
  });
}

export async function deleteAdminProperty(id: string, token: string, mode: 'soft' | 'permanent' = 'soft') {
  return fetchApi<{ success: boolean; message: string; deleteMode: string }>(`/admin/properties/${id}?deleteMode=${mode}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ deleteMode: mode })
  });
}

export async function getAdminMessageThreadById(id: string, token: string) {
  return fetchApi<{ data: any }>(`/admin/messages/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function deleteAdminMessageThread(id: string, token: string) {
  return fetchApi<{ message: string }>(`/admin/messages/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Contact Messages Admin
export async function getAdminContactMessages(token: string, params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val));
    }
  });
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return fetchApi<{ total: number; metrics: any; data: any[] }>(`/admin/contact-messages${queryString}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getAdminContactMessageById(id: string, token: string) {
  return fetchApi<{ data: any }>(`/admin/contact-messages/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function updateAdminContactMessageStatus(id: string, status: string, token: string) {
  return fetchApi<{ data: any }>(`/admin/contact-messages/${id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status })
  });
}

export async function deleteAdminContactMessage(id: string, token: string) {
  return fetchApi<{ message: string }>(`/admin/contact-messages/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Site Settings Admin (9M)
export async function getAdminSiteSettings(token: string) {
  return fetchApi<{ data: any }>('/admin/settings', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function updateAdminSiteSettings(data: any, token: string) {
  return fetchApi<{ data: any }>('/admin/settings', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

// Homepage CMS Admin (9N)
export async function getAdminHomepageConfig(token: string) {
  return fetchApi<{ data: any }>('/admin/homepage', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function updateAdminHomepageConfig(data: any, token: string) {
  return fetchApi<{ data: any }>('/admin/homepage', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

// Host Dashboard & Host Property Management API
export async function applyBecomeHost(token: string) {
  return fetchApi<{ success: boolean; message: string; user?: any }>('/host/apply', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getHostDashboard(token: string) {
  return fetchApi<{ data: any }>('/host/dashboard', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getHostProperties(token: string, params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val));
    }
  });
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return fetchApi<{ count: number; data: any[] }>(`/host/properties${queryString}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getHostPropertyById(id: string, token: string) {
  return fetchApi<{ data: any }>(`/host/properties/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function createHostProperty(data: any, token: string) {
  return fetchApi<{ message: string; data: any }>('/host/properties', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export async function updateHostProperty(id: string, data: any, token: string) {
  return fetchApi<{ message: string; data: any }>(`/host/properties/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export async function deleteHostProperty(id: string, token: string) {
  return fetchApi<{ success: boolean; message: string }>(`/host/properties/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getHostPropertyMedia(id: string, token: string) {
  return fetchApi<{ data: any }>(`/host/properties/${id}/media`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function uploadHostPropertyImage(id: string, filePayload: any, token: string) {
  return fetchApi<{ message: string; data: any }>(`/host/properties/${id}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(filePayload)
  });
}

export async function deleteHostPropertyImage(id: string, imageId: string | number, token: string) {
  return fetchApi<{ message: string }>(`/host/properties/${id}/media/${imageId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function setHostPrimaryImage(id: string, imageId: string | number, token: string) {
  return fetchApi<{ message: string; data: any }>(`/host/properties/${id}/media/${imageId}/primary`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function reorderHostPropertyImages(id: string, orders: any[], token: string) {
  return fetchApi<{ message: string }>(`/host/properties/${id}/media/reorder`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ orders })
  });
}

export async function getHostReservations(token: string, params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val));
    }
  });
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return fetchApi<{ count: number; data: any[] }>(`/host/reservations${queryString}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getHostReservationById(id: string, token: string) {
  return fetchApi<{ data: any }>(`/host/reservations/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getHostMessages(token: string) {
  return fetchApi<{ count: number; data: any[] }>('/host/messages', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getHostReviews(token: string) {
  return fetchApi<{ count: number; data: any[] }>('/host/reviews', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getHostProfile(token: string) {
  return fetchApi<{ data: any }>('/host/profile', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function updateHostProfile(data: any, token: string) {
  return fetchApi<{ message: string; data: any }>('/host/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

// Host & Admin Earnings API
export async function getHostEarnings(token: string, params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val));
    }
  });
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return fetchApi<{ total: number; page: number; totalPages: number; data: any[] }>(`/host/earnings${queryString}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getHostEarningsSummary(token: string) {
  return fetchApi<{ data: { totalEarnings: number; pendingEarnings: number; availableEarnings: number; paidEarnings: number; totalGross: number; totalCommission: number; count: number } }>('/host/earnings/summary', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getHostEarningById(id: string, token: string) {
  return fetchApi<{ data: any }>(`/host/earnings/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getAdminEarnings(token: string, params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val));
    }
  });
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return fetchApi<{ total: number; page: number; totalPages: number; summary: any; data: any[] }>(`/admin/earnings${queryString}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function updateAdminEarningStatus(id: string, status: string, token: string) {
  return fetchApi<{ message: string; data: any }>(`/admin/earnings/${id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status })
  });
}

// Payment Verification API
export async function submitPaymentProof(id: string, filePayload: any, metaPayload: { transactionId?: string; paymentNote?: string }, token: string) {
  return fetchApi<{ success: boolean; message: string; data: any }>(`/reservations/${id}/payment-proof`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ file: filePayload, ...metaPayload })
  });
}

export async function getPaymentProof(id: string, token: string) {
  return fetchApi<{ success: boolean; data: any }>(`/reservations/${id}/payment-proof`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function verifyPaymentProofAdmin(id: string, token: string) {
  return fetchApi<{ success: boolean; message: string; reservation: any; hostEarning: any }>(`/admin/reservations/${id}/payment-verification/verify`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function rejectPaymentProofAdmin(id: string, rejectionReason: string, token: string) {
  return fetchApi<{ success: boolean; message: string; data: any }>(`/admin/reservations/${id}/payment-verification/reject`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ rejectionReason })
  });
}

export async function updateAdminPaymentVerificationStatus(id: string, paymentVerificationStatus: string, token: string) {
  return fetchApi<{ success: boolean; data: any }>(`/admin/reservations/${id}/payment-verification-status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ paymentVerificationStatus })
  });
}

