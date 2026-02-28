declare module 'qrcode-generator' {
  interface SvgOptions {
    scalable?: boolean;
    margin?: number;
    cellSize?: number;
  }

  interface QRCode {
    addData(data: string): void;
    make(): void;
    createSvgTag(options?: SvgOptions): string;
  }

  function qrcode(typeNumber: number, errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H'): QRCode;

  export default qrcode;
}
