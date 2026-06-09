import { Platform } from 'react-native';

// true  → EC2 production: http://32.196.32.28/api  (nginx path-based routing, no port)
// false → local dev:       http://10.0.2.2:3000/api  (Android emulator)
//                          http://localhost:3000/api  (iOS simulator / web)
const IS_PROD = true;

const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const PROD_URL = 'http://32.196.32.28/api';
const DEV_URL  = `http://${DEV_HOST}:3000/api`;

export const BASE_URL = IS_PROD ? PROD_URL : DEV_URL;
