type Listener=(userId?:string)=>void;
const listeners=new Set<Listener>();
export function openSpatialProfile(userId?:string){for(const listener of listeners)listener(userId)}
export function subscribeSpatialProfile(listener:Listener){listeners.add(listener);return()=>listeners.delete(listener)}
