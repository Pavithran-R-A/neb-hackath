// A narrow source leak check, not a comprehensive secret scanner or certification.
export function scanText(text,secrets=[]){
 return {secretMatch:secrets.some(secret=>typeof secret==='string'&&secret.length>=16&&text.includes(secret)),privateKeyMarker:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)};
}
