import { SpatialReelsHub } from '../components/SpatialReelsHub';
import { Listing } from '../types';
type Props={listings:Listing[];favorites:string[];messagesCount:number;offersCount:number};
export function AIAssistantScreen(_props:Props){return <SpatialReelsHub/>;}
