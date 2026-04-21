import { webcrypto } from 'crypto'

Object.defineProperty(global.crypto, 'getRandomValues', {
  value: (arr: any) => webcrypto.getRandomValues(arr),
})
