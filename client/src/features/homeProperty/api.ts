// ─── Home & Property Hub API ──────────────────────────────────────────────────
// Enhancement 21 — Propel Stack AI, LLC

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';
import type {
  Property, MaintenanceTask, Appliance,
  Vehicle, ServiceLogEntry, InsurancePolicy,
  UtilityBill, UtilitySpike, RentalLease,
} from './types';

const BASE = '/api/home-property';

// ─── Properties ───────────────────────────────────────────────────────────────
export function useProperties() {
  return useQuery({ queryKey: ['properties'], queryFn: () => apiRequest<{ properties: Property[] }>(`${BASE}/properties`) });
}
export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d: Partial<Property>) => apiRequest<{ property: Property }>(`${BASE}/properties`, { method: 'POST', body: JSON.stringify(d) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['properties'] }) });
}
export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => apiRequest(`${BASE}/properties/${id}`, { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['properties'] }) });
}

// ─── Maintenance ──────────────────────────────────────────────────────────────
export function useMaintenanceTasks(propertyId?: string) {
  const qs = propertyId ? `?property_id=${propertyId}` : '';
  return useQuery({ queryKey: ['maintenance', propertyId ?? 'all'], queryFn: () => apiRequest<{ tasks: MaintenanceTask[] }>(`${BASE}/maintenance${qs}`) });
}
export function useCreateMaintenanceTask() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d: Partial<MaintenanceTask>) => apiRequest<{ task: MaintenanceTask }>(`${BASE}/maintenance`, { method: 'POST', body: JSON.stringify(d) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['maintenance'] }) });
}
export function useMarkTaskDone() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => apiRequest<{ ok: boolean; next_due: string }>(`${BASE}/maintenance/${id}/done`, { method: 'PATCH', body: '{}' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['maintenance'] }) });
}
export function useDeleteMaintenanceTask() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => apiRequest(`${BASE}/maintenance/${id}`, { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['maintenance'] }) });
}
export function useGenerateMaintenanceSchedule() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d: { property_type: string; climate_zone: string; property_age_years: number; property_id?: string }) => apiRequest<{ tasks: { task_name: string; category: string; frequency_days: number }[] }>(`${BASE}/maintenance/generate`, { method: 'POST', body: JSON.stringify(d) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['maintenance'] }) });
}

// ─── Appliances ───────────────────────────────────────────────────────────────
export function useAppliances() {
  return useQuery({ queryKey: ['appliances'], queryFn: () => apiRequest<{ appliances: Appliance[] }>(`${BASE}/appliances`) });
}
export function useCreateAppliance() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d: Partial<Appliance>) => apiRequest<{ appliance: Appliance }>(`${BASE}/appliances`, { method: 'POST', body: JSON.stringify(d) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['appliances'] }) });
}
export function useDeleteAppliance() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => apiRequest(`${BASE}/appliances/${id}`, { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['appliances'] }) });
}

// ─── Vehicles ─────────────────────────────────────────────────────────────────
export function useVehicles() {
  return useQuery({ queryKey: ['vehicles'], queryFn: () => apiRequest<{ vehicles: Vehicle[] }>(`${BASE}/vehicles`) });
}
export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d: Partial<Vehicle>) => apiRequest<{ vehicle: Vehicle }>(`${BASE}/vehicles`, { method: 'POST', body: JSON.stringify(d) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }) });
}
export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => apiRequest(`${BASE}/vehicles/${id}`, { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }) });
}
export function useVehicleServiceLog(vehicleId: string) {
  return useQuery({ queryKey: ['service-log', vehicleId], queryFn: () => apiRequest<{ log: ServiceLogEntry[] }>(`${BASE}/vehicles/${vehicleId}/service`), enabled: !!vehicleId });
}
export function useLogVehicleService(vehicleId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d: Partial<ServiceLogEntry>) => apiRequest(`${BASE}/vehicles/${vehicleId}/service`, { method: 'POST', body: JSON.stringify(d) }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles'] }); qc.invalidateQueries({ queryKey: ['service-log', vehicleId] }); } });
}

// ─── Insurance ────────────────────────────────────────────────────────────────
export function useInsurance() {
  return useQuery({ queryKey: ['insurance'], queryFn: () => apiRequest<{ policies: InsurancePolicy[] }>(`${BASE}/insurance`) });
}
export function useCreateInsurance() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d: Partial<InsurancePolicy>) => apiRequest<{ policy: InsurancePolicy }>(`${BASE}/insurance`, { method: 'POST', body: JSON.stringify(d) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['insurance'] }) });
}
export function useDeleteInsurance() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => apiRequest(`${BASE}/insurance/${id}`, { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['insurance'] }) });
}

// ─── Utilities ────────────────────────────────────────────────────────────────
export function useUtilityBills(propertyId?: string) {
  const qs = propertyId ? `?property_id=${propertyId}` : '';
  return useQuery({ queryKey: ['utilities', propertyId ?? 'all'], queryFn: () => apiRequest<{ bills: UtilityBill[] }>(`${BASE}/utilities${qs}`) });
}
export function useUtilitySpikes() {
  return useQuery({ queryKey: ['utility-spikes'], queryFn: () => apiRequest<{ spikes: UtilitySpike[] }>(`${BASE}/utilities/spikes`) });
}
export function useCreateUtilityBill() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d: Partial<UtilityBill>) => apiRequest(`${BASE}/utilities`, { method: 'POST', body: JSON.stringify(d) }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['utilities'] }); qc.invalidateQueries({ queryKey: ['utility-spikes'] }); } });
}
export function useDeleteUtilityBill() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => apiRequest(`${BASE}/utilities/${id}`, { method: 'DELETE' }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['utilities'] }); qc.invalidateQueries({ queryKey: ['utility-spikes'] }); } });
}

// ─── Rental ───────────────────────────────────────────────────────────────────
export function useRentalLeases() {
  return useQuery({ queryKey: ['rental'], queryFn: () => apiRequest<{ leases: RentalLease[] }>(`${BASE}/rental`) });
}
export function useCreateLease() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d: Partial<RentalLease>) => apiRequest<{ lease: RentalLease }>(`${BASE}/rental`, { method: 'POST', body: JSON.stringify(d) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['rental'] }) });
}
export function useLogRentPayment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => apiRequest(`${BASE}/rental/${id}/payment`, { method: 'PATCH', body: '{}' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['rental'] }) });
}
export function useDeleteLease() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => apiRequest(`${BASE}/rental/${id}`, { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['rental'] }) });
}
