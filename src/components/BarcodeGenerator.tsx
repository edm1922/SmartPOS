'use client';

import { useEffect, useRef, forwardRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeGeneratorProps {
  value: string;
  format?: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  className?: string;
}

export const BarcodeGenerator = forwardRef<SVGSVGElement, BarcodeGeneratorProps>(({
  value,
  format = 'CODE128',
  width = 2,
  height = 100,
  displayValue = true,
  fontSize = 12,
  className = '',
}, ref) => {
  const internalRef = useRef<SVGSVGElement>(null);
  const svgRef = ref || internalRef;

  useEffect(() => {
    const element = 'current' in svgRef ? svgRef.current : null;
    if (element && value) {
      try {
        JsBarcode(element, value, {
          format,
          width,
          height,
          displayValue,
          fontSize,
          margin: 10,
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [value, format, width, height, displayValue, fontSize, svgRef]);

  if (!value) {
    return <div className="text-gray-500">No barcode data available</div>;
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg ref={svgRef} />
    </div>
  );
});

BarcodeGenerator.displayName = 'BarcodeGenerator';

export const downloadBarcodeAsImage = (svgElement: SVGSVGElement, filename: string) => {
  try {
    // Get the SVG data
    const svgData = new XMLSerializer().serializeToString(svgElement);
    
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }
    
    // Create an image to render the SVG
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      // Set canvas dimensions to match the SVG
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw the image on the canvas
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // Create a download link
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `${filename}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Clean up
      URL.revokeObjectURL(url);
    };
    
    img.src = url;
  } catch (error) {
    console.error('Error downloading barcode as image:', error);
  }
};

export const printBarcode = (svgElement: SVGSVGElement, productName: string) => {
  try {
    // Get the SVG data
    const svgData = new XMLSerializer().serializeToString(svgElement);
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      console.error('Could not open print window');
      return;
    }
    
    // Write HTML content to the print window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 20px;
              font-family: Arial, sans-serif;
            }
            .product-name {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .barcode-container {
              margin: 20px 0;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="product-name">${productName}</div>
          <div class="barcode-container">
            ${svgData}
          </div>
          <script>
            window.onload = function() {
              window.print();
              // Close the window after printing (optional)
              // window.close();
            }
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  } catch (error) {
    console.error('Error printing barcode:', error);
  }
};