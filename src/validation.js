const dns = require('dns').promises;
const { isIP } = require('net');

const normalizeIPv4MappedIPv6 = (ip) => {
  if (!ip.includes(':')) return ip;
  
  const lower = ip.toLowerCase();
  
  if (lower.startsWith('::ffff:')) {
    const suffix = lower.substring(7);
    
    const dotMatch = suffix.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (dotMatch) {
      return suffix;
    }
    
    const hexMatch = suffix.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hexMatch) {
      const high = parseInt(hexMatch[1], 16);
      const low = parseInt(hexMatch[2], 16);
      const byte1 = (high >> 8) & 0xff;
      const byte2 = high & 0xff;
      const byte3 = (low >> 8) & 0xff;
      const byte4 = low & 0xff;
      return `${byte1}.${byte2}.${byte3}.${byte4}`;
    }
    
    const compactHexMatch = suffix.match(/^([0-9a-f]{1,8})$/);
    if (compactHexMatch) {
      const value = parseInt(compactHexMatch[1], 16);
      const byte1 = (value >> 24) & 0xff;
      const byte2 = (value >> 16) & 0xff;
      const byte3 = (value >> 8) & 0xff;
      const byte4 = value & 0xff;
      return `${byte1}.${byte2}.${byte3}.${byte4}`;
    }
  }
  
  return ip;
};

const isPrivateIP = (ip) => {
  const normalized = normalizeIPv4MappedIPv6(ip);
  
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = normalized.match(ipv4Pattern);
  
  if (match) {
    const parts = match.slice(1).map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
    if (parts[0] === 0) return true;
    if (parts[0] === 255) return true;
    if (parts[0] === 224) return true;
    if (parts[0] >= 240) return true;
  }
  
  if (normalized === '::1' || normalized === '::') return true;
  
  if (normalized.includes(':')) {
    const lower = normalized.toLowerCase();
    
    const firstHextet = lower.split(':').find(h => h.length > 0);
    if (firstHextet) {
      const firstHexValue = parseInt(firstHextet, 16);
      
      if ((firstHexValue & 0xfe00) === 0xfc00) return true;
      if ((firstHexValue & 0xffc0) === 0xfe80) return true;
      if ((firstHexValue & 0xff00) === 0xff00) return true;
      if ((firstHexValue & 0xff00) === 0xfe00) return true;
    }
    
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    if (lower.startsWith('fe')) return true;
    if (lower.startsWith('ff')) return true;
  }
  
  return false;
};

const validateUrl = async (targetUrl) => {
  try {
    const url = new URL(targetUrl);
    
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
    }
    
    const hostname = url.hostname;
    
    if (hostname === 'localhost' || hostname.endsWith('.local')) {
      return { valid: false, error: 'Access to localhost is not allowed' };
    }
    
    if (isIP(hostname)) {
      if (isPrivateIP(hostname)) {
        return { valid: false, error: 'Access to private IP addresses is not allowed' };
      }
    } else {
      let hasValidAddress = false;
      
      try {
        const addresses = await dns.resolve4(hostname);
        for (const addr of addresses) {
          if (isPrivateIP(addr)) {
            return { valid: false, error: 'Domain resolves to a private IP address' };
          }
        }
        hasValidAddress = true;
      } catch (e) {
      }
      
      try {
        const addresses6 = await dns.resolve6(hostname);
        for (const addr of addresses6) {
          if (isPrivateIP(addr)) {
            return { valid: false, error: 'Domain resolves to a private IP address' };
          }
        }
        hasValidAddress = true;
      } catch (e) {
      }
      
      if (!hasValidAddress) {
        return { valid: false, error: 'Unable to resolve hostname' };
      }
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
};

module.exports = {
  normalizeIPv4MappedIPv6,
  isPrivateIP,
  validateUrl
};
