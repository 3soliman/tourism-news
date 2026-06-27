import { apiGet, apiPost, apiPatch, apiDelete } from './client';

export async function fetchChannelManagerConnections(propertyId) {
  return apiGet(`/channel-manager-connections/?property=${propertyId}`);
}

export async function createChannelManagerConnection(propertyId, data) {
  return apiPost('/channel-manager-connections/', { property: propertyId, ...data });
}

export async function updateChannelManagerConnection(id, data) {
  return apiPatch(`/channel-manager-connections/${id}/`, data);
}

export async function deleteChannelManagerConnection(id) {
  return apiDelete(`/channel-manager-connections/${id}/`);
}
