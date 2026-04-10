import CryptoJS from 'crypto-js';

const SECRET_KEY = 'termtool-secret-key-2024';

export const encryptData = (data: any, key: string = SECRET_KEY): string => {
  try {
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, key).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('数据加密失败');
  }
};

export const decryptData = (encrypted: string, key: string = SECRET_KEY): any => {
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, key);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('数据解密失败');
  }
};

export const hashPassword = (password: string): string => {
  return CryptoJS.SHA256(password).toString();
};

export const generateKey = (): string => {
  return CryptoJS.lib.WordArray.random(256 / 8).toString();
};
