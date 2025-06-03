import React, { useRef } from 'react';
import { Button } from '@mui/material';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface EventReportGeneratorProps {
  eventId: number;
  eventData: {
    filename: string;
    startTime: string;
    duration: number;
    triggerTime: string;
    peakX: number;
    peakY: number;
    peakZ: number;
    maxVsum: number;
    domFreqX: number;
    domFreqY: number;
    domFreqZ: number;
    unit: string;
  };
  chartRefs: {
    x: React.RefObject<HTMLDivElement | null>;
    y: React.RefObject<HTMLDivElement | null>;
    z: React.RefObject<HTMLDivElement | null>;
  };
}

const EventReportGenerator: React.FC<EventReportGeneratorProps> = ({ 
  eventId, 
  eventData,
  chartRefs 
}) => {
  const reportRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
      return dateString;
    }
  };

  const formatDuration = (seconds: number) => {
    try {
      const date = new Date(0);
      date.setSeconds(seconds);
      return date.toISOString().substr(11, 8);
    } catch (e) {
      return `${seconds}s`;
    }
  };

  const convertUnits = (value: number, unit: string) => {
    if (unit === 'mm/s') return (value / 25.4).toFixed(3);
    return value.toFixed(3);
  };

  const generatePDF = async () => {
    if (!reportRef.current || !chartRefs.x.current || !chartRefs.y.current || !chartRefs.z.current) {
      console.error('Missing required refs for PDF generation');
      return;
    }

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
    //   const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const lineHeight = 6;
      pdf.setFontSize(16);
      pdf.text('DGMTS Testing', pageWidth / 2, margin + 8, { align: 'center' });
      pdf.setFontSize(8);
      let currentY = margin + 20;
      pdf.text(`File: ${eventData.filename}.SCS`, margin, currentY);
      pdf.text(`Event ID: ${eventId}`, pageWidth - margin - 30, currentY, { align: 'right' });
      currentY += lineHeight;
      pdf.text(`Start: ${formatDate(eventData.startTime)}`, margin, currentY);
      pdf.text(`Trigger: ${formatDate(eventData.triggerTime)}`, pageWidth / 2, currentY);
      currentY += lineHeight;
      pdf.text(`Duration: ${formatDuration(eventData.duration)}`, margin, currentY);
      pdf.text(`Units: ${eventData.unit === 'mm/s' ? 'in/s ' : eventData.unit}`, 
               pageWidth / 2, currentY);
      currentY += lineHeight * 1.5;
      pdf.setFont('', 'bold');
      pdf.text('Max Amplitudes:', margin, currentY);
      pdf.setFont('', 'normal');
      
      const ampY = currentY + lineHeight;
      pdf.text('X:', margin, ampY);
      pdf.text(convertUnits(eventData.peakX, eventData.unit), margin + 15, ampY);
      
      pdf.text('Y:', margin + 40, ampY);
      pdf.text(convertUnits(eventData.peakY, eventData.unit), margin + 55, ampY);
      
      pdf.text('Z:', margin + 80, ampY);
      pdf.text(convertUnits(eventData.peakZ, eventData.unit), margin + 95, ampY);
      
      pdf.text('VSUM:', margin + 120, ampY);
      pdf.text(convertUnits(eventData.maxVsum, eventData.unit), margin + 150, ampY);
      currentY += lineHeight * 2;
      pdf.setFont('', 'bold');
      pdf.text('Dominant Frequencies (Hz):', margin, currentY);
      pdf.setFont('', 'normal');
      const freqY = currentY + lineHeight;
      pdf.text('X:', margin, freqY);
      pdf.text(eventData.domFreqX.toFixed(2), margin + 15, freqY);
      pdf.text('Y:', margin + 40, freqY);
      pdf.text(eventData.domFreqY.toFixed(2), margin + 55, freqY);  
      pdf.text('Z:', margin + 80, freqY);
      pdf.text(eventData.domFreqZ.toFixed(2), margin + 95, freqY);
      currentY += lineHeight * 2;

      // Convert charts to canvas and add to PDF
      const addChartToPdf = async (chartRef: React.RefObject<HTMLDivElement | null>, yPos: number) => {
        const canvas = await html2canvas(chartRef.current!, {
          scale: 2,
          logging: false,
          useCORS: true,
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', margin, yPos, imgWidth, imgHeight);
        return yPos + imgHeight + 5;
      };

      // Start charts lower since we've compacted the header
      let chartY = currentY + 5;
      
      try {
        chartY = await addChartToPdf(chartRefs.x, chartY);
        chartY = await addChartToPdf(chartRefs.y, chartY);
        await addChartToPdf(chartRefs.z, chartY);
      } catch (e) {
        console.error('Failed to render charts:', e);
      }

      pdf.save(`DGMTS_Event_${eventId}_Report.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please check console for details.');
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <Button 
        variant="contained" 
        color="primary" 
        onClick={generatePDF}
        style={{ marginBottom: '20px' }}
      >
        Download PDF Report
      </Button>
      
      {/* Hidden div for PDF content structure */}
      <div style={{ display: 'none' }}>
        <div ref={reportRef}>
          <h1>DGMTS Testing</h1>
          <div>
            <h2>Event Information</h2>
            <p>Filename: {eventData.filename}.SCS</p>
            <p>Date: {formatDate(eventData.startTime)}</p>
            <p>Duration: {formatDuration(eventData.duration)}</p>
            <p>Trigger time: {formatDate(eventData.triggerTime)}</p>
            
            <h3>Max amplitudes</h3>
            <p>X: {convertUnits(eventData.peakX, eventData.unit)} {eventData.unit === 'mm/s' ? 'in/s' : eventData.unit}</p>
            <p>Y: {convertUnits(eventData.peakY, eventData.unit)} {eventData.unit === 'mm/s' ? 'in/s' : eventData.unit}</p>
            <p>Z: {convertUnits(eventData.peakZ, eventData.unit)} {eventData.unit === 'mm/s' ? 'in/s' : eventData.unit}</p>
            <p>VSUM: {convertUnits(eventData.maxVsum, eventData.unit)} {eventData.unit === 'mm/s' ? 'in/s' : eventData.unit}</p>
            
            <h3>Dominant frequencies</h3>
            <p>X: {eventData.domFreqX.toFixed(2)} Hz</p>
            <p>Y: {eventData.domFreqY.toFixed(2)} Hz</p>
            <p>Z: {eventData.domFreqZ.toFixed(2)} Hz</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventReportGenerator;