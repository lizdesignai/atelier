// src/lib/productHelper.ts
// Helper centralizado para identificação e roteamento por tipo de produto no Atelier

export type ProductType = 'instagram' | 'mapa' | 'idv';

export function getProductTypeFromProject(project: any): ProductType {
  if (!project) return 'idv';
  const raw = `${project.service_type || ''} ${project.type || ''} ${project.service || ''}`.toLowerCase();
  
  if (
    raw.includes('instagram') || 
    raw.includes('pacote') || 
    raw.includes('social') || 
    raw.includes('gestão') || 
    raw.includes('gestao')
  ) {
    return 'instagram';
  }
  
  if (raw.includes('mapa')) {
    return 'mapa';
  }
  
  return 'idv';
}

export function getProductRedirectUrl(productType: ProductType): string {
  switch (productType) {
    case 'instagram':
      return '/cockpit';
    case 'mapa':
      return '/mapa';
    case 'idv':
    default:
      return '/';
  }
}

export function getClientServiceLabel(productType: ProductType): string {
  switch (productType) {
    case 'instagram':
      return 'Gestão de Instagram';
    case 'mapa':
      return 'O Mapa';
    case 'idv':
    default:
      return 'Identidade Visual';
  }
}
