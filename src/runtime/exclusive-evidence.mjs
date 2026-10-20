import {open} from 'node:fs/promises';

/** Claim an evidence pathname once; a prior record can never be replaced by a rerun. */
export async function claimEvidenceFile(path,mode=0o600){
 const handle=await open(path,'wx',mode);let closed=false;
 return {
  async write(value){if(closed)throw Error('Evidence claim is closed');const bytes=Buffer.from(value);await handle.truncate(0);let offset=0;while(offset<bytes.length){const {bytesWritten}=await handle.write(bytes,offset,bytes.length-offset,offset);if(bytesWritten<1)throw Error('Evidence write did not advance');offset+=bytesWritten;}await handle.sync();},
  async close(){if(closed)return;closed=true;await handle.close();}
 };
}
