import type {Media} from './model';
import {comparisonPairs} from './evidence';
export type PdfEvidenceOptions={includePhotos:boolean;selectedPhotoIds?:string[];includeComparison:boolean;selectedComparisonIds?:string[]};
export const defaultPdfOptions=():PdfEvidenceOptions=>({includePhotos:true,includeComparison:false});
export function reportEvidence(media:Media[],kind:string,options:PdfEvidenceOptions){
 const visible=media.filter(m=>!m.deleted&&(kind==='comparison'||m.phase===kind));
 return {photos:options.includePhotos?visible.filter(m=>m.mime.startsWith('image/')&&(!options.selectedPhotoIds||options.selectedPhotoIds.includes(m.id))):[],pairs:kind==='comparison'&&options.includeComparison?comparisonPairs(visible).filter(pair=>!options.selectedComparisonIds||options.selectedComparisonIds.includes(pair.returned.id)):[]};
}
