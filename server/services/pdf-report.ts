import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import type { 
  Audit, 
  Company, 
  AuditInterview, 
  AuditSiteVisit, 
  AuditIndicatorResponse,
  Finding,
  AuditSite
} from '@shared/schema';
import { getNdisStandard } from './ndis-standards';

function safeFormatDate(dateValue: string | Date | null | undefined, formatStr: string, fallback: string = 'Not set'): string {
  if (!dateValue) return fallback;
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (isNaN(date.getTime())) return fallback;
  return format(date, formatStr);
}

function cleanComment(comment: string | null | undefined): string | null {
  if (!comment) return null;
  const urlPattern = /https?:\/\/[^\s]+/g;
  const cleaned = comment.replace(urlPattern, '').trim();
  if (!cleaned || cleaned.length < 3) {
    return 'Evidence attached';
  }
  return cleaned;
}

function formatStatus(status: string | null | undefined): string {
  if (!status) return 'Not specified';
  const labels: Record<string, string> = {
    DRAFT: 'Draft',
    IN_PROGRESS: 'In Progress',
    IN_REVIEW: 'In Review',
    COMPLETED: 'Completed',
    ARCHIVED: 'Archived',
    OPEN: 'Open',
    CLOSED: 'Closed'
  };
  return labels[status] || status.replace(/_/g, ' ');
}

interface ReportData {
  audit: Audit;
  company: Company;
  interviews: AuditInterview[];
  siteVisits: AuditSiteVisit[];
  indicatorResponses: AuditIndicatorResponse[];
  findings: any[];
  sites: AuditSite[];
}

const COLORS = {
  primary: '#1e3a5f',
  secondary: '#2563eb',
  success: '#16a34a',
  warning: '#ca8a04',
  danger: '#dc2626',
  muted: '#6b7280',
  light: '#f3f4f6',
  white: '#ffffff',
  black: '#111827'
};

const RATING_COLORS: Record<string, string> = {
  CONFORMITY_BEST_PRACTICE: '#10b981',
  CONFORMITY: COLORS.success,
  MINOR_NC: '#f97316',
  MAJOR_NC: COLORS.danger
};

const RATING_LABELS: Record<string, string> = {
  CONFORMITY_BEST_PRACTICE: 'Best Practice',
  CONFORMITY: 'Conformity',
  MINOR_NC: 'Minor Non-Conformance',
  MAJOR_NC: 'Major Non-Conformance'
};

function formatAuditPurpose(purpose: string | null | undefined): string {
  const labels: Record<string, string> = {
    INITIAL_CERTIFICATION: 'Initial Certification',
    RECERTIFICATION: 'Recertification',
    SURVEILLANCE: 'Surveillance Audit',
    SCOPE_EXTENSION: 'Scope Extension',
    TRANSFER_AUDIT: 'Transfer Audit',
    SPECIAL_AUDIT: 'Special Audit'
  };
  return purpose ? labels[purpose] || purpose : 'Not specified';
}

function formatMethodology(methodology: string | null | undefined): string {
  const labels: Record<string, string> = {
    ONSITE: 'On-site',
    REMOTE: 'Remote',
    HYBRID: 'Hybrid (On-site & Remote)'
  };
  return methodology ? labels[methodology] || methodology : 'Not specified';
}

function formatInterviewMethod(method: string): string {
  const labels: Record<string, string> = {
    FACE_TO_FACE: 'Face-to-Face',
    PHONE: 'Phone',
    VIDEO: 'Video Conference',
    FOCUS_GROUP: 'Focus Group'
  };
  return labels[method] || method;
}

function formatInterviewType(type: string): string {
  const labels: Record<string, string> = {
    PARTICIPANT: 'Participant',
    STAFF: 'Staff',
    STAKEHOLDER: 'Stakeholder'
  };
  return labels[type] || type;
}

export function generateAuditReportPDF(data: ReportData): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 60, bottom: 60, left: 50, right: 50 },
    bufferPages: true,
    info: {
      Title: `Audit Report - ${data.audit.title}`,
      Author: data.company.legalName,
      Subject: 'NDIS Compliance Audit Report',
      Creator: 'NDIS Provider Compliance Platform'
    }
  });

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  generateCoverPage(doc, data, pageWidth);
  doc.addPage();
  generateTableOfContents(doc, data, pageWidth);
  doc.addPage();
  generateExecutiveSummary(doc, data, pageWidth);
  doc.addPage();
  generateAuditOverview(doc, data, pageWidth);
  doc.addPage();
  generateAuditResults(doc, data, pageWidth);
  
  if (data.findings.length > 0) {
    if (doc.y > doc.page.height - 200) {
      doc.addPage();
    } else {
      doc.moveDown(2);
    }
    generateFindings(doc, data, pageWidth);
  }
  
  if (data.interviews.length > 0) {
    if (doc.y > doc.page.height - 200) {
      doc.addPage();
    } else {
      doc.moveDown(2);
    }
    generateInterviews(doc, data, pageWidth);
  }
  
  if (data.siteVisits.length > 0) {
    if (doc.y > doc.page.height - 200) {
      doc.addPage();
    } else {
      doc.moveDown(2);
    }
    generateSiteVisits(doc, data, pageWidth);
  }

  // Registration Groups & Witnessing section
  const regGroups = (data.audit as any).registrationGroupsWitnessing;
  if (regGroups && Array.isArray(regGroups) && regGroups.length > 0) {
    if (doc.y > doc.page.height - 200) {
      doc.addPage();
    } else {
      doc.moveDown(2);
    }
    generateRegistrationGroups(doc, regGroups, pageWidth);
  }

  // Conclusion & Sign-off section
  const conclusionData = (data.audit as any).conclusionData;
  if (conclusionData) {
    if (doc.y > doc.page.height - 200) {
      doc.addPage();
    } else {
      doc.moveDown(2);
    }
    generateConclusionSection(doc, data, conclusionData, pageWidth);
  }

  addPageNumbers(doc);

  return doc;
}

function generateCoverPage(doc: PDFKit.PDFDocument, data: ReportData, pageWidth: number) {
  const { audit, company } = data;
  
  doc.rect(0, 0, doc.page.width, 180).fill(COLORS.primary);
  
  doc.fillColor(COLORS.white)
    .fontSize(14)
    .text('NDIS PROVIDER COMPLIANCE', doc.page.margins.left, 50, { width: pageWidth, align: 'center' });
  
  doc.fontSize(28)
    .font('Helvetica-Bold')
    .text('AUDIT REPORT', doc.page.margins.left, 85, { width: pageWidth, align: 'center' });

  doc.fontSize(12)
    .font('Helvetica')
    .text('Confidential', doc.page.margins.left, 130, { width: pageWidth, align: 'center' });

  doc.y = 220;

  doc.fillColor(COLORS.black)
    .fontSize(20)
    .font('Helvetica-Bold')
    .text(audit.title, { align: 'center' });

  doc.moveDown(0.5);
  doc.fontSize(14)
    .font('Helvetica')
    .fillColor(COLORS.muted)
    .text(formatAuditPurpose(audit.auditPurpose), { align: 'center' });

  doc.y = 320;
  
  doc.fillColor(COLORS.black)
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('Entity Being Audited:', { continued: false });
  
  doc.font('Helvetica')
    .fontSize(16)
    .text(audit.entityName || company.legalName);
  
  if (audit.entityAbn || company.abn) {
    doc.fontSize(11)
      .fillColor(COLORS.muted)
      .text(`ABN: ${audit.entityAbn || company.abn}`);
  }
  
  if (audit.entityAddress) {
    doc.text(audit.entityAddress);
  }

  doc.moveDown(1.5);
  
  if (audit.externalAuditorOrg) {
    doc.fillColor(COLORS.black)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Certification Body:');
    
    doc.font('Helvetica')
      .fontSize(14)
      .text(audit.externalAuditorOrg);
    
    if (audit.externalAuditorName) {
      doc.fontSize(11)
        .fillColor(COLORS.muted)
        .text(`Lead Auditor: ${audit.externalAuditorName}`);
    }
  }

  doc.y = 520;
  
  const leftColX = doc.page.margins.left;
  const rightColX = doc.page.margins.left + pageWidth / 2;
  
  doc.fillColor(COLORS.black)
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Audit Period:', leftColX, doc.y);
  
  const scopeFrom = safeFormatDate(audit.scopeTimeFrom, 'dd MMM yyyy');
  const scopeTo = safeFormatDate(audit.scopeTimeTo, 'dd MMM yyyy');
  doc.font('Helvetica')
    .text(`${scopeFrom} - ${scopeTo}`, leftColX, doc.y + 12);

  doc.font('Helvetica-Bold')
    .text('Methodology:', rightColX, doc.y - 12);
  doc.font('Helvetica')
    .text(formatMethodology(audit.methodology), rightColX, doc.y);

  doc.moveDown(2);
  
  doc.font('Helvetica-Bold')
    .text('Report Date:', leftColX);
  doc.font('Helvetica')
    .text(format(new Date(), 'dd MMMM yyyy'), leftColX, doc.y + 12);

  if (company.ndisRegistrationNumber) {
    doc.font('Helvetica-Bold')
      .text('NDIS Registration:', rightColX, doc.y - 12);
    doc.font('Helvetica')
      .text(company.ndisRegistrationNumber || 'N/A', rightColX, doc.y);
  }

  doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill(COLORS.light);
  doc.fillColor(COLORS.muted)
    .fontSize(8)
    .text('This document is confidential and intended for the named recipient only.', 
      doc.page.margins.left, doc.page.height - 28, { width: pageWidth, align: 'center' });
}

function generateTableOfContents(doc: PDFKit.PDFDocument, data: ReportData, pageWidth: number) {
  doc.fillColor(COLORS.primary)
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('Table of Contents');
  
  doc.moveDown(1);
  
  const tocItems = [
    { title: '1. Executive Summary' },
    { title: '2. Audit Overview' },
    { title: '3. Audit Results & Scoring' }
  ];
  
  let sectionNum = 4;
  
  if (data.findings.length > 0) {
    tocItems.push({ title: `${sectionNum++}. Findings & Non-Conformances` });
  }
  
  if (data.interviews.length > 0) {
    tocItems.push({ title: `${sectionNum++}. Interview Summary` });
  }
  
  if (data.siteVisits.length > 0) {
    tocItems.push({ title: `${sectionNum++}. Site Visit Observations` });
  }
  
  const regGroups = (data.audit as any).registrationGroupsWitnessing;
  if (regGroups && Array.isArray(regGroups) && regGroups.length > 0) {
    tocItems.push({ title: `${sectionNum++}. Registration Groups & Witnessing` });
  }
  
  const conclusionData = (data.audit as any).conclusionData;
  if (conclusionData) {
    tocItems.push({ title: `${sectionNum++}. Conclusion & Sign-off` });
  }

  tocItems.forEach((item) => {
    doc.fillColor(COLORS.black)
      .fontSize(12)
      .font('Helvetica')
      .text(item.title, doc.page.margins.left);
    
    doc.moveDown(0.6);
  });
}

function generateExecutiveSummary(doc: PDFKit.PDFDocument, data: ReportData, pageWidth: number) {
  sectionHeader(doc, '1. Executive Summary');
  
  doc.moveDown(0.5);
  
  if (data.audit.executiveSummary) {
    doc.fillColor(COLORS.black)
      .fontSize(11)
      .font('Helvetica')
      .text(data.audit.executiveSummary, { 
        align: 'justify',
        lineGap: 4
      });
  } else {
    doc.fillColor(COLORS.muted)
      .fontSize(11)
      .font('Helvetica-Oblique')
      .text('Executive summary has not been generated for this audit.');
  }

  doc.moveDown(1.5);

  const scores = calculateScores(data.indicatorResponses);
  
  doc.fillColor(COLORS.primary)
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('Overall Score Summary');
  
  doc.moveDown(0.5);

  const boxWidth = (pageWidth - 30) / 4;
  const boxHeight = 70;
  const startX = doc.page.margins.left;
  const boxY = doc.y;

  const boxes = [
    { label: 'Best Practice', count: scores.bestPractice, color: '#10b981' },
    { label: 'Conformity', count: scores.conformity, color: COLORS.success },
    { label: 'Minor NC', count: scores.minorNc, color: '#f97316' },
    { label: 'Major NC', count: scores.majorNc, color: COLORS.danger }
  ];

  boxes.forEach((box, idx) => {
    const x = startX + (boxWidth + 10) * idx;
    doc.rect(x, boxY, boxWidth, boxHeight).fill(box.color);
    
    doc.fillColor(COLORS.white)
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(box.count.toString(), x, boxY + 15, { width: boxWidth, align: 'center' });
    
    doc.fontSize(9)
      .font('Helvetica')
      .text(box.label, x, boxY + 45, { width: boxWidth, align: 'center' });
  });

  doc.y = boxY + boxHeight + 20;

  doc.fillColor(COLORS.black)
    .fontSize(11)
    .font('Helvetica')
    .text(`Total Indicators Assessed: ${scores.total}`);
  
  doc.text(`Score: ${scores.points} / ${scores.maxPoints} points (${scores.percentage}%)`);
}

function generateAuditOverview(doc: PDFKit.PDFDocument, data: ReportData, pageWidth: number) {
  const { audit, company, sites } = data;
  
  sectionHeader(doc, '2. Audit Overview');
  
  doc.moveDown(0.5);

  subsectionHeader(doc, '2.1 Audit Details');
  
  const details = [
    ['Audit Title', audit.title],
    ['Audit Type', audit.auditType],
    ['Audit Purpose', formatAuditPurpose(audit.auditPurpose)],
    ['Methodology', formatMethodology(audit.methodology)],
    ['Service Context', audit.serviceContextLabel || audit.serviceContext],
    ['Audit Period', `${safeFormatDate(audit.scopeTimeFrom, 'dd MMM yyyy')} - ${safeFormatDate(audit.scopeTimeTo, 'dd MMM yyyy')}`],
    ['Status', formatStatus(audit.status)]
  ];

  details.forEach(([label, value]) => {
    doc.fillColor(COLORS.muted)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(`${label}: `, { continued: true });
    doc.fillColor(COLORS.black)
      .font('Helvetica')
      .text(value || 'Not specified');
  });

  doc.moveDown(1);
  
  subsectionHeader(doc, '2.2 Entity Being Audited');
  
  const entityDetails = [
    ['Organisation Name', audit.entityName || company.legalName],
    ['ABN', audit.entityAbn || company.abn || 'N/A'],
    ['Address', audit.entityAddress || 'Not specified'],
    ['NDIS Registration', company.ndisRegistrationNumber || 'N/A']
  ];

  entityDetails.forEach(([label, value]) => {
    doc.fillColor(COLORS.muted)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(`${label}: `, { continued: true });
    doc.fillColor(COLORS.black)
      .font('Helvetica')
      .text(value || 'Not specified');
  });

  if (sites && sites.length > 0) {
    doc.moveDown(1);
    subsectionHeader(doc, '2.3 Sites Audited');
    
    sites.forEach((site, idx) => {
      const siteLabel = site.isPrimarySite ? `${site.siteName} (Primary Site)` : site.siteName;
      doc.fillColor(COLORS.black)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`${idx + 1}. ${siteLabel}`);
      
      if (site.address) {
        doc.fillColor(COLORS.muted)
          .font('Helvetica')
          .text(`   ${site.address}${site.city ? `, ${site.city}` : ''}${site.state ? ` ${site.state}` : ''} ${site.postcode || ''}`);
      }
    });
  }

  if (audit.externalAuditorOrg) {
    doc.moveDown(1);
    subsectionHeader(doc, sites && sites.length > 0 ? '2.4 Certification Body' : '2.3 Certification Body');
    
    const auditorDetails = [
      ['Organisation', audit.externalAuditorOrg],
      ['Lead Auditor', audit.externalAuditorName || 'Not specified'],
      ['Contact', audit.externalAuditorEmail || 'Not specified']
    ];

    auditorDetails.forEach(([label, value]) => {
      doc.fillColor(COLORS.muted)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`${label}: `, { continued: true });
      doc.fillColor(COLORS.black)
        .font('Helvetica')
        .text(value || 'Not specified');
    });
  }

  if (audit.description) {
    doc.moveDown(1);
    subsectionHeader(doc, 'Audit Description');
    doc.fillColor(COLORS.black)
      .fontSize(10)
      .font('Helvetica')
      .text(audit.description, { align: 'justify' });
  }
}

function generateAuditResults(doc: PDFKit.PDFDocument, data: ReportData, pageWidth: number) {
  sectionHeader(doc, '3. Audit Results');
  
  doc.moveDown(0.5);
  
  const scores = calculateScores(data.indicatorResponses);

  subsectionHeader(doc, '3.1 Scoring Summary');
  
  doc.fillColor(COLORS.black)
    .fontSize(11)
    .font('Helvetica')
    .text(`A total of ${scores.total} indicators were assessed during this audit.`);
  
  doc.moveDown(0.5);

  const tableTop = doc.y;
  const col1Width = pageWidth * 0.5;
  const col2Width = pageWidth * 0.25;
  const col3Width = pageWidth * 0.25;
  const rowHeight = 25;

  doc.rect(doc.page.margins.left, tableTop, pageWidth, rowHeight).fill(COLORS.primary);
  
  doc.fillColor(COLORS.white)
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Rating', doc.page.margins.left + 5, tableTop + 7)
    .text('Count', doc.page.margins.left + col1Width + 5, tableTop + 7)
    .text('Points', doc.page.margins.left + col1Width + col2Width + 5, tableTop + 7);

  const rows = [
    { label: 'Best Practice (+3 pts each)', count: scores.bestPractice, points: scores.bestPractice * 3, color: '#10b981' },
    { label: 'Conformity (+2 pts each)', count: scores.conformity, points: scores.conformity * 2, color: COLORS.success },
    { label: 'Minor Non-Conformance (+1 pt each)', count: scores.minorNc, points: scores.minorNc * 1, color: '#f97316' },
    { label: 'Major Non-Conformance (0 pts)', count: scores.majorNc, points: 0, color: COLORS.danger }
  ];

  rows.forEach((row, idx) => {
    const y = tableTop + rowHeight + (idx * rowHeight);
    const bgColor = idx % 2 === 0 ? COLORS.light : COLORS.white;
    
    doc.rect(doc.page.margins.left, y, pageWidth, rowHeight).fill(bgColor);
    
    doc.rect(doc.page.margins.left, y + 5, 4, rowHeight - 10).fill(row.color);
    
    doc.fillColor(COLORS.black)
      .fontSize(10)
      .font('Helvetica')
      .text(row.label, doc.page.margins.left + 12, y + 7)
      .text(row.count.toString(), doc.page.margins.left + col1Width + 5, y + 7)
      .text(row.points.toString(), doc.page.margins.left + col1Width + col2Width + 5, y + 7);
  });

  const totalY = tableTop + rowHeight + (rows.length * rowHeight);
  doc.rect(doc.page.margins.left, totalY, pageWidth, rowHeight).fill(COLORS.primary);
  
  doc.fillColor(COLORS.white)
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('TOTAL', doc.page.margins.left + 5, totalY + 7)
    .text(scores.total.toString(), doc.page.margins.left + col1Width + 5, totalY + 7)
    .text(`${scores.points} / ${scores.maxPoints}`, doc.page.margins.left + col1Width + col2Width + 5, totalY + 7);

  doc.y = totalY + rowHeight + 20;

  const scoreBoxWidth = 150;
  const scoreBoxX = doc.page.margins.left + (pageWidth - scoreBoxWidth) / 2;
  
  let scoreColor = COLORS.success;
  if (scores.percentage < 50) scoreColor = COLORS.danger;
  else if (scores.percentage < 75) scoreColor = COLORS.warning;
  
  doc.rect(scoreBoxX, doc.y, scoreBoxWidth, 60).fill(scoreColor);
  
  doc.fillColor(COLORS.white)
    .fontSize(28)
    .font('Helvetica-Bold')
    .text(`${scores.percentage}%`, scoreBoxX, doc.y + 10, { width: scoreBoxWidth, align: 'center' });
  
  doc.fontSize(10)
    .font('Helvetica')
    .text('Overall Score', scoreBoxX, doc.y + 40, { width: scoreBoxWidth, align: 'center' });

  doc.y = doc.y + 80;

  // Overall Compliance Status Table (Box format like DNV)
  if (data.indicatorResponses.length > 0) {
    doc.moveDown(1);
    subsectionHeader(doc, '3.2 Overall Compliance Status');
    
    // NDIS Standards with divisions
    const NDIS_STANDARDS_INFO: Record<string, { name: string; division: string }> = {
      "11": { name: "Governance and Operational Management", division: "Division 2 – Governance and Operational Management" },
      "12": { name: "Risk Management", division: "Division 2 – Governance and Operational Management" },
      "13": { name: "Quality Management", division: "Division 2 – Governance and Operational Management" },
      "14": { name: "Information Management", division: "Division 2 – Governance and Operational Management" },
      "15": { name: "Feedback and Complaints Management", division: "Division 2 – Governance and Operational Management" },
      "16": { name: "Incident Management", division: "Division 2 – Governance and Operational Management" },
      "17": { name: "Human Resource Management", division: "Division 3 – Provision of Supports" },
      "18": { name: "Continuity of Supports", division: "Division 3 – Provision of Supports" },
      "18A": { name: "Emergency and Disaster Management", division: "Division 3 – Provision of Supports" },
    };

    const ratingToScore: Record<string, number> = {
      "CONFORMITY_BEST_PRACTICE": 3,
      "CONFORMITY": 2,
      "MINOR_NC": 1,
      "MAJOR_NC": 0,
    };

    // Group responses by NDIS standard with scores
    const standardScores: Record<string, { total: number; count: number }> = {};
    
    data.indicatorResponses.forEach((response: any) => {
      const indicatorText = response.indicatorText || '';
      let ndisStandard = response.ndisStandardNumber && response.ndisStandardName 
        ? { number: response.ndisStandardNumber, name: response.ndisStandardName }
        : getNdisStandard(indicatorText);
      
      if (ndisStandard && response.rating) {
        const key = ndisStandard.number;
        if (!standardScores[key]) {
          standardScores[key] = { total: 0, count: 0 };
        }
        standardScores[key].total += ratingToScore[response.rating] || 0;
        standardScores[key].count++;
      }
    });
    
    // Calculate averages and group by division
    const standardResults = Object.entries(standardScores).map(([key, scores]) => ({
      number: key,
      name: NDIS_STANDARDS_INFO[key]?.name || `Standard ${key}`,
      division: NDIS_STANDARDS_INFO[key]?.division || 'Other',
      avgRating: scores.count > 0 ? Math.round((scores.total / scores.count) * 10) / 10 : 0,
      indicatorCount: scores.count,
    })).sort((a, b) => {
      const numA = parseInt(a.number.replace(/\D/g, '')) || 99;
      const numB = parseInt(b.number.replace(/\D/g, '')) || 99;
      return numA - numB;
    });

    // Group by division
    const byDivision: Record<string, typeof standardResults> = {};
    standardResults.forEach(result => {
      if (!byDivision[result.division]) {
        byDivision[result.division] = [];
      }
      byDivision[result.division].push(result);
    });
    
    if (standardResults.length > 0) {
      const stdTableTop = doc.y;
      const stdRowHeight = 22;
      const divisionRowHeight = 24;
      const stdCol1Width = 80;
      const stdCol2Width = pageWidth - stdCol1Width - 60;
      const stdCol3Width = 60;
      
      // Table header with primary color
      doc.rect(doc.page.margins.left, stdTableTop, pageWidth, stdRowHeight).fill(COLORS.secondary);
      doc.fillColor(COLORS.white)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Standard', doc.page.margins.left + 8, stdTableTop + 6)
        .text('Name', doc.page.margins.left + stdCol1Width + 8, stdTableTop + 6)
        .text('Rating', doc.page.margins.left + stdCol1Width + stdCol2Width + 8, stdTableTop + 6);
      
      let currentY = stdTableTop + stdRowHeight;
      
      Object.entries(byDivision).forEach(([division, standards]) => {
        // Check if we need a new page
        if (currentY > doc.page.height - 100) {
          doc.addPage();
          currentY = doc.page.margins.top;
        }
        
        // Division header row
        doc.rect(doc.page.margins.left, currentY, pageWidth, divisionRowHeight).fill('#e0f2fe');
        doc.fillColor(COLORS.primary)
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(division, doc.page.margins.left + 8, currentY + 7);
        currentY += divisionRowHeight;
        
        // Standard rows
        standards.forEach((std, idx) => {
          if (currentY > doc.page.height - 80) {
            doc.addPage();
            currentY = doc.page.margins.top;
          }
          
          const bgColor = idx % 2 === 0 ? COLORS.white : '#f8fafc';
          doc.rect(doc.page.margins.left, currentY, pageWidth, stdRowHeight).fill(bgColor);
          
          // Draw cell borders
          doc.strokeColor('#e2e8f0').lineWidth(0.5);
          doc.rect(doc.page.margins.left, currentY, pageWidth, stdRowHeight).stroke();
          
          doc.fillColor(COLORS.black)
            .fontSize(9)
            .font('Helvetica');
          
          // Empty standard column (nested under division)
          doc.text('', doc.page.margins.left + 8, currentY + 6);
          
          // Name column
          doc.text(`${std.number} ${std.name}`, doc.page.margins.left + stdCol1Width + 8, currentY + 6, { width: stdCol2Width - 16 });
          
          // Rating column with color coding
          const ratingColor = std.avgRating >= 2.5 ? COLORS.success : 
                             std.avgRating >= 1.5 ? COLORS.warning : COLORS.danger;
          doc.fillColor(ratingColor)
            .font('Helvetica-Bold')
            .fontSize(11)
            .text(std.avgRating.toString(), doc.page.margins.left + stdCol1Width + stdCol2Width + 8, currentY + 5, { width: stdCol3Width - 16, align: 'center' });
          
          currentY += stdRowHeight;
        });
      });
      
      // Draw outer border
      doc.strokeColor(COLORS.secondary).lineWidth(1);
      doc.rect(doc.page.margins.left, stdTableTop, pageWidth, currentY - stdTableTop).stroke();
      
      // Reset cursor position properly after table
      doc.x = doc.page.margins.left;
      doc.y = currentY + 20;
    }
    
    // Ensure we're at left margin before continuing
    doc.x = doc.page.margins.left;
    doc.moveDown(1);
    subsectionHeader(doc, '3.3 Indicator Responses');
    
    const groupedResponses = groupByRating(data.indicatorResponses);
    
    Object.entries(groupedResponses).forEach(([rating, responses]) => {
      if (responses.length === 0) return;
      
      doc.fillColor(RATING_COLORS[rating] || COLORS.black)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`${RATING_LABELS[rating]} (${responses.length})`);
      
      doc.moveDown(0.3);
      
      responses.forEach((response: any) => {
        if (doc.y > doc.page.height - 80) {
          doc.addPage();
        }
        
        const indicatorText = response.indicatorText || 'Indicator';
        const cleanedComment = cleanComment(response.comment);
        
        // Get NDIS standard - from database or fallback to mapping
        let ndisStandard = response.ndisStandardNumber && response.ndisStandardName 
          ? { number: response.ndisStandardNumber, name: response.ndisStandardName }
          : getNdisStandard(indicatorText);
        
        doc.fillColor(COLORS.black)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(`• ${indicatorText}`, { continued: true });
        
        // Show NDIS standard reference
        if (ndisStandard) {
          doc.fillColor(COLORS.secondary)
            .font('Helvetica')
            .fontSize(8)
            .text(` [Std ${ndisStandard.number}]`, { continued: cleanedComment ? true : false });
        }
        
        if (cleanedComment) {
          doc.font('Helvetica')
            .fontSize(9)
            .fillColor(COLORS.muted)
            .text(` - ${cleanedComment}`);
        } else {
          doc.text('');
        }
      });
      
      doc.moveDown(0.5);
    });
  }
}

function generateFindings(doc: PDFKit.PDFDocument, data: ReportData, pageWidth: number) {
  sectionHeader(doc, '4. Findings & Non-Conformances');
  
  doc.moveDown(0.5);
  
  doc.fillColor(COLORS.black)
    .fontSize(11)
    .font('Helvetica')
    .text(`This section details the ${data.findings.length} finding(s) identified during the audit.`);
  
  doc.moveDown(1);

  data.findings.forEach((finding, idx) => {
    if (doc.y > doc.page.height - 200) {
      doc.addPage();
    }

    const severityColor = finding.severity === 'MAJOR_NC' ? COLORS.danger : '#f97316';

    doc.rect(doc.page.margins.left, doc.y, pageWidth, 25).fill(severityColor);
    
    const findingTitle = finding.findingText.length > 60 
      ? finding.findingText.substring(0, 60) + '...' 
      : finding.findingText;
    
    doc.fillColor(COLORS.white)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`Finding ${idx + 1}: ${findingTitle}`, doc.page.margins.left + 10, doc.y + 6);

    doc.y = doc.y + 30;

    doc.fillColor(COLORS.muted)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Severity: ', { continued: true });
    doc.fillColor(COLORS.black)
      .font('Helvetica')
      .text(finding.severity === 'MAJOR_NC' ? 'Major Non-Conformance' : 'Minor Non-Conformance');

    doc.fillColor(COLORS.muted)
      .font('Helvetica-Bold')
      .text('Status: ', { continued: true });
    doc.fillColor(COLORS.black)
      .font('Helvetica')
      .text(formatStatus(finding.status));

    if (finding.dueDate) {
      doc.fillColor(COLORS.muted)
        .font('Helvetica-Bold')
        .text('Due Date: ', { continued: true });
      doc.fillColor(COLORS.black)
        .font('Helvetica')
        .text(safeFormatDate(finding.dueDate, 'dd MMM yyyy'));
    }

    doc.moveDown(0.3);
    doc.fillColor(COLORS.muted)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Finding Details:');
    doc.fillColor(COLORS.black)
      .font('Helvetica')
      .text(finding.findingText, { align: 'justify' });

    if (finding.closureNote) {
      doc.moveDown(0.3);
      doc.fillColor(COLORS.muted)
        .font('Helvetica-Bold')
        .text('Closure Notes:');
      doc.fillColor(COLORS.black)
        .font('Helvetica')
        .text(finding.closureNote, { align: 'justify' });
    }

    // Corrective Action Journey (if activities exist)
    if (finding.activities && finding.activities.length > 0) {
      doc.moveDown(0.5);
      doc.fillColor(COLORS.primary)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Corrective Action Journey:');
      doc.moveDown(0.2);
      
      const activityLabels: Record<string, string> = {
        CREATED: 'Finding Created',
        STATUS_CHANGED: 'Status Changed',
        OWNER_ASSIGNED: 'Owner Assigned',
        DUE_DATE_SET: 'Due Date Set',
        COMMENT_ADDED: 'Comment Added',
        EVIDENCE_REQUESTED: 'Evidence Requested',
        EVIDENCE_SUBMITTED: 'Evidence Submitted',
        EVIDENCE_REVIEWED: 'Evidence Reviewed',
        CLOSURE_INITIATED: 'Closure Initiated',
        CLOSED: 'Finding Closed',
        REOPENED: 'Finding Reopened',
      };
      
      finding.activities.forEach((activity: any, actIdx: number) => {
        if (doc.y > doc.page.height - 60) {
          doc.addPage();
        }
        
        const activityDate = safeFormatDate(activity.createdAt, 'dd MMM yyyy HH:mm', 'Unknown');
        const activityLabel = activityLabels[activity.activityType] || activity.activityType;
        const performedBy = activity.performedByUser?.fullName || 'System';
        
        doc.fillColor(COLORS.muted)
          .fontSize(8)
          .font('Helvetica')
          .text(`${actIdx + 1}. ${activityDate} - ${activityLabel}`, { continued: true });
        
        doc.fillColor(COLORS.black)
          .text(` (${performedBy})`);
        
        if (activity.previousValue && activity.newValue) {
          doc.fillColor(COLORS.muted)
            .fontSize(8)
            .text(`   ${activity.previousValue} → ${activity.newValue}`);
        }
        
        if (activity.comment) {
          const commentPreview = activity.comment.length > 100 
            ? activity.comment.substring(0, 100) + '...' 
            : activity.comment;
          doc.fillColor(COLORS.black)
            .fontSize(8)
            .font('Helvetica-Oblique')
            .text(`   "${commentPreview}"`);
          doc.font('Helvetica');
        }
      });
    }

    // Evidence Requests and Submitted Evidence
    const evidenceRequests = Array.isArray(finding.evidenceRequests) ? finding.evidenceRequests : [];
    if (evidenceRequests.length > 0) {
      doc.moveDown(0.5);
      doc.fillColor(COLORS.secondary)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Evidence Requests:');
      doc.moveDown(0.2);

      const evidenceTypeLabels: Record<string, string> = {
        CLIENT_PROFILE: 'Client Profile / Intake Record',
        NDIS_PLAN: 'NDIS Plan',
        SERVICE_AGREEMENT: 'Service Agreement',
        CONSENT_FORM: 'Consent Form',
        GUARDIAN_DOCUMENTATION: 'Guardian / Nominee Documentation',
        CARE_PLAN: 'Care / Support Plan',
        BSP: 'Behaviour Support Plan (BSP)',
        MMP: 'Mealtime Management Plan (MMP)',
        HEALTH_PLAN: 'Health Management Plan',
        COMMUNICATION_PLAN: 'Communication Plan',
        RISK_ASSESSMENT: 'Risk Assessment',
        EMERGENCY_PLAN: 'Emergency / Evacuation Plan',
        ROSTER: 'Roster / Shift Allocation',
        SHIFT_NOTES: 'Shift Notes / Case Notes',
        DAILY_LOG: 'Daily Support Log',
        PROGRESS_NOTES: 'Progress Notes',
        ACTIVITY_RECORD: 'Activity / Community Access Record',
        QUALIFICATION: 'Qualification / Credential',
        WWCC: 'WWCC / Police Check / NDIS Screening',
        TRAINING_RECORD: 'Training Record / Certificate',
        SUPERVISION_RECORD: 'Supervision Record',
        MEDICATION_PLAN: 'Medication Management Plan',
        MAR: 'Medication Administration Record (MAR)',
        PRN_LOG: 'PRN Protocol / Usage Log',
        INCIDENT_REPORT: 'Incident Report',
        COMPLAINT_RECORD: 'Complaint Record',
        RP_RECORD: 'Restrictive Practice Record',
        SERVICE_BOOKING: 'Service Booking / Funding Allocation',
        INVOICE_CLAIM: 'Invoice / Claim Record',
        POLICY: 'Policy Document',
        PROCEDURE: 'Procedure Document',
        REVIEW_RECORD: 'Review / Monitoring Record',
        OTHER: 'Other Document',
      };

      evidenceRequests.forEach((request: any, reqIdx: number) => {
        if (doc.y > doc.page.height - 80) {
          doc.addPage();
        }

        const statusColor = request.status === 'ACCEPTED' ? COLORS.success :
                           request.status === 'SUBMITTED' ? COLORS.secondary :
                           request.status === 'REJECTED' ? COLORS.danger :
                           COLORS.warning;
        
        const typeLabel = evidenceTypeLabels[request.evidenceType] || request.evidenceType;

        doc.fillColor(COLORS.black)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(`${reqIdx + 1}. ${typeLabel}`, { continued: true });
        
        doc.fillColor(statusColor)
          .text(` [${request.status}]`);

        if (request.requestNote) {
          doc.fillColor(COLORS.muted)
            .fontSize(8)
            .font('Helvetica')
            .text(`   Request: ${request.requestNote.length > 80 ? request.requestNote.substring(0, 80) + '...' : request.requestNote}`);
        }

        const items = Array.isArray(request.items) ? request.items : [];
        if (items.length > 0) {
          doc.fillColor(COLORS.success)
            .fontSize(8)
            .font('Helvetica')
            .text(`   Submitted Files (${items.length}):`);
          
          items.forEach((item: any) => {
            doc.fillColor(COLORS.black)
              .fontSize(7)
              .text(`     • ${item.fileName || 'Unknown file'}`);
          });
        }
      });
    }

    // Closure Evidence (if separate from requests)
    const closureEvidence = Array.isArray(finding.closureEvidence) ? finding.closureEvidence : [];
    if (closureEvidence.length > 0) {
      doc.moveDown(0.3);
      doc.fillColor(COLORS.success)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(`Closure Evidence: ${closureEvidence.length} item(s) linked`);
    }

    // Only add spacing if not the last finding
    if (idx < data.findings.length - 1) {
      doc.moveDown(1);
    }
  });
}

function generateInterviews(doc: PDFKit.PDFDocument, data: ReportData, pageWidth: number) {
  sectionHeader(doc, 'Interview Summary');
  
  doc.moveDown(0.5);
  
  doc.fillColor(COLORS.black)
    .fontSize(11)
    .font('Helvetica')
    .text(`A total of ${data.interviews.length} interview(s) were conducted during the audit.`);
  
  doc.moveDown(1);

  const grouped = {
    PARTICIPANT: data.interviews.filter(i => i.interviewType === 'PARTICIPANT'),
    STAFF: data.interviews.filter(i => i.interviewType === 'STAFF'),
    STAKEHOLDER: data.interviews.filter(i => i.interviewType === 'STAKEHOLDER')
  };

  Object.entries(grouped).forEach(([type, interviews]) => {
    if (interviews.length === 0) return;

    subsectionHeader(doc, `${formatInterviewType(type)} Interviews (${interviews.length})`);
    
    interviews.forEach((interview, idx) => {
      if (doc.y > doc.page.height - 150) {
        doc.addPage();
      }

      doc.fillColor(COLORS.black)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`${idx + 1}. ${interview.intervieweeName || 'Anonymous'}`);

      const details = [];
      if (interview.intervieweeRole) details.push(`Role: ${interview.intervieweeRole}`);
      if (interview.interviewMethod) details.push(`Method: ${formatInterviewMethod(interview.interviewMethod)}`);
      if (interview.siteLocation) details.push(`Location: ${interview.siteLocation}`);
      if (interview.interviewDate) details.push(`Date: ${safeFormatDate(interview.interviewDate, 'dd MMM yyyy')}`);

      if (details.length > 0) {
        doc.fillColor(COLORS.muted)
          .fontSize(9)
          .font('Helvetica')
          .text(details.join(' | '));
      }

      if (interview.feedbackPositive) {
        doc.fillColor(COLORS.success)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('Positive: ', { continued: true });
        doc.fillColor(COLORS.black)
          .font('Helvetica')
          .text(interview.feedbackPositive);
      }

      if (interview.feedbackConcerns) {
        doc.fillColor(COLORS.danger)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('Concerns: ', { continued: true });
        doc.fillColor(COLORS.black)
          .font('Helvetica')
          .text(interview.feedbackConcerns);
      }

      // Participant Feedback Checklist
      const feedbackChecklist = Array.isArray(interview.feedbackChecklist) ? interview.feedbackChecklist : [];
      const checkedItems = feedbackChecklist.filter((item: any) => item.checked || item.partial);
      if (checkedItems.length > 0) {
        doc.moveDown(0.3);
        doc.fillColor(COLORS.primary)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('Participant Feedback:');
        
        checkedItems.forEach((item: any) => {
          if (doc.y > doc.page.height - 40) {
            doc.addPage();
          }
          const status = item.partial ? '(Partial)' : '';
          doc.fillColor(COLORS.black)
            .fontSize(8)
            .font('Helvetica')
            .text(`  ☑ ${item.item} ${status}`);
        });
      }

      doc.moveDown(0.5);
    });
  });
}

function generateSiteVisits(doc: PDFKit.PDFDocument, data: ReportData, pageWidth: number) {
  sectionHeader(doc, 'Site Visit Observations');
  
  doc.moveDown(0.5);
  
  doc.fillColor(COLORS.black)
    .fontSize(11)
    .font('Helvetica')
    .text(`${data.siteVisits.length} site visit(s) were conducted during the audit.`);
  
  doc.moveDown(1);

  data.siteVisits.forEach((visit, idx) => {
    if (doc.y > doc.page.height - 200) {
      doc.addPage();
    }

    doc.rect(doc.page.margins.left, doc.y, pageWidth, 25).fill(COLORS.secondary);
    
    doc.fillColor(COLORS.white)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`Site ${idx + 1}: ${visit.siteName}`, doc.page.margins.left + 10, doc.y + 6);

    doc.y = doc.y + 30;

    if (visit.siteAddress) {
      doc.fillColor(COLORS.muted)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Address: ', { continued: true });
      doc.fillColor(COLORS.black)
        .font('Helvetica')
        .text(visit.siteAddress);
    }

    if (visit.visitDate) {
      doc.fillColor(COLORS.muted)
        .font('Helvetica-Bold')
        .text('Visit Date: ', { continued: true });
      doc.fillColor(COLORS.black)
        .font('Helvetica')
        .text(safeFormatDate(visit.visitDate, 'dd MMM yyyy'));
    }

    const stats = [];
    if (visit.participantsAtSite) stats.push(`${visit.participantsAtSite} participants observed`);
    if (visit.filesReviewedCount) stats.push(`${visit.filesReviewedCount} files reviewed`);
    
    if (stats.length > 0) {
      doc.fillColor(COLORS.black)
        .fontSize(9)
        .font('Helvetica')
        .text(stats.join(' | '));
    }

    if (visit.observationsPositive) {
      doc.moveDown(0.3);
      doc.fillColor(COLORS.success)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Positive Observations:');
      doc.fillColor(COLORS.black)
        .font('Helvetica')
        .text(visit.observationsPositive, { align: 'justify' });
    }

    if (visit.observationsConcerns) {
      doc.moveDown(0.3);
      doc.fillColor(COLORS.danger)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Concerns:');
      doc.fillColor(COLORS.black)
        .font('Helvetica')
        .text(visit.observationsConcerns, { align: 'justify' });
    }

    // Document Checklist
    const documentChecklist = Array.isArray(visit.documentChecklist) ? visit.documentChecklist : [];
    const checkedDocs = documentChecklist.filter((item: any) => item.checked || item.partial);
    if (checkedDocs.length > 0) {
      doc.moveDown(0.3);
      doc.fillColor(COLORS.primary)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Document Checklist:');
      
      checkedDocs.forEach((item: any) => {
        if (doc.y > doc.page.height - 40) {
          doc.addPage();
        }
        const status = item.partial ? '(Partially)' : '';
        doc.fillColor(COLORS.black)
          .fontSize(8)
          .font('Helvetica')
          .text(`  ☑ ${item.item} ${status}`);
      });
    }

    if (visit.safetyItemsChecked && visit.safetyItemsChecked.length > 0) {
      doc.moveDown(0.3);
      doc.fillColor(COLORS.muted)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Safety Items Checked:');
      
      visit.safetyItemsChecked.forEach(item => {
        const checkmark = item.checked ? '✓' : '✗';
        const color = item.checked ? COLORS.success : COLORS.danger;
        doc.fillColor(color)
          .font('Helvetica')
          .text(`  ${checkmark} ${item.item}`);
      });
    }

    // Only add spacing if not the last visit
    if (idx < data.siteVisits.length - 1) {
      doc.moveDown(1);
    }
  });
}

function sectionHeader(doc: PDFKit.PDFDocument, title: string, pageWidth?: number) {
  // Check if we need a new page for section header + minimum content
  if (doc.y > doc.page.height - 120) {
    doc.addPage();
  }
  
  const contentWidth = pageWidth || (doc.page.width - doc.page.margins.left - doc.page.margins.right);
  
  doc.fillColor(COLORS.primary)
    .fontSize(18)
    .font('Helvetica-Bold')
    .text(title, doc.page.margins.left, doc.y, { width: contentWidth });
  
  doc.moveTo(doc.page.margins.left, doc.y + 2)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y + 2)
    .strokeColor(COLORS.primary)
    .lineWidth(2)
    .stroke();
  
  doc.moveDown(0.5);
}

function subsectionHeader(doc: PDFKit.PDFDocument, title: string) {
  doc.fillColor(COLORS.secondary)
    .fontSize(12)
    .font('Helvetica-Bold')
    .text(title);
  doc.moveDown(0.3);
}

function calculateScores(responses: AuditIndicatorResponse[]) {
  const bestPractice = responses.filter(r => r.rating === 'CONFORMITY_BEST_PRACTICE').length;
  const conformity = responses.filter(r => r.rating === 'CONFORMITY').length;
  const minorNc = responses.filter(r => r.rating === 'MINOR_NC').length;
  const majorNc = responses.filter(r => r.rating === 'MAJOR_NC').length;
  
  const total = responses.length;
  const points = (bestPractice * 3) + (conformity * 2) + (minorNc * 1) + (majorNc * 0);
  const maxPoints = total * 3;
  const percentage = maxPoints > 0 ? Math.round((points / maxPoints) * 100) : 0;
  
  return { bestPractice, conformity, minorNc, majorNc, total, points, maxPoints, percentage };
}

function groupByRating(responses: AuditIndicatorResponse[]) {
  return {
    CONFORMITY_BEST_PRACTICE: responses.filter(r => r.rating === 'CONFORMITY_BEST_PRACTICE'),
    CONFORMITY: responses.filter(r => r.rating === 'CONFORMITY'),
    MINOR_NC: responses.filter(r => r.rating === 'MINOR_NC'),
    MAJOR_NC: responses.filter(r => r.rating === 'MAJOR_NC')
  };
}

function generateRegistrationGroups(doc: PDFKit.PDFDocument, regGroups: any[], pageWidth: number) {
  sectionHeader(doc, 'Registration Groups & Witnessing');
  
  doc.moveDown(0.5);
  
  const colWidths = [80, pageWidth - 220, 70, 70];
  
  // Helper to draw table header
  function drawTableHeader() {
    const headerY = doc.y;
    doc.rect(doc.page.margins.left, headerY - 5, pageWidth, 25).fill(COLORS.primary);
    
    doc.fillColor(COLORS.white)
      .fontSize(9)
      .font('Helvetica-Bold');
    
    let xPos = doc.page.margins.left + 5;
    doc.text('NDIS Code', xPos, headerY, { width: colWidths[0] });
    xPos += colWidths[0];
    doc.text('Registration Group', xPos, headerY, { width: colWidths[1] });
    xPos += colWidths[1];
    doc.text('Status', xPos, headerY, { width: colWidths[2], align: 'center' });
    xPos += colWidths[2];
    doc.text('Witnessed', xPos, headerY, { width: colWidths[3], align: 'center' });
    
    doc.y = headerY + 25;
  }
  
  // Draw initial header
  drawTableHeader();
  
  // Table rows
  regGroups.forEach((group, idx) => {
    // Check if we need a new page and redraw header
    if (doc.y > doc.page.height - 60) {
      doc.addPage();
      drawTableHeader();
    }
    
    const rowY = doc.y;
    const bgColor = idx % 2 === 0 ? COLORS.light : COLORS.white;
    doc.rect(doc.page.margins.left, rowY - 3, pageWidth, 20).fill(bgColor);
    
    doc.fillColor(COLORS.black)
      .fontSize(8)
      .font('Helvetica');
    
    let xPos = doc.page.margins.left + 5;
    doc.text(group.itemCode || '', xPos, rowY, { width: colWidths[0] });
    xPos += colWidths[0];
    doc.text(group.itemLabel || '', xPos, rowY, { width: colWidths[1] });
    xPos += colWidths[1];
    
    const statusColor = group.status === 'ADD' ? COLORS.success : group.status === 'REMOVE' ? COLORS.danger : COLORS.black;
    doc.fillColor(statusColor)
      .text(group.status || 'Keep', xPos, rowY, { width: colWidths[2], align: 'center' });
    xPos += colWidths[2];
    
    doc.fillColor(COLORS.black)
      .text(group.witnessed || 'N/A', xPos, rowY, { width: colWidths[3], align: 'center' });
    
    doc.y = rowY + 20;
  });
  
  doc.moveDown(0.5);
}

function generateConclusionSection(doc: PDFKit.PDFDocument, data: ReportData, conclusionData: any, pageWidth: number) {
  sectionHeader(doc, 'Conclusion & Sign-off');
  
  doc.moveDown(0.5);
  
  // Conclusion text in a box
  if (conclusionData.conclusionText) {
    drawTextBox(doc, 'Audit Conclusion', conclusionData.conclusionText, pageWidth, COLORS.light, COLORS.primary);
    doc.moveDown(1);
  }
  
  // Auditor Endorsements
  if (conclusionData.endorsement1 || conclusionData.endorsement2 || conclusionData.endorsement3) {
    if (doc.y > doc.page.height - 150) doc.addPage();
    
    subsectionHeader(doc, 'Auditor Endorsements');
    
    const endorsements = [
      { checked: conclusionData.endorsement1, text: 'Audit conducted in accordance with NDIS Quality and Safeguards Commission requirements' },
      { checked: conclusionData.endorsement2, text: 'Findings based on objective evidence gathered during the audit' },
      { checked: conclusionData.endorsement3, text: 'All non-conformances accurately documented and communicated' }
    ];
    
    const boxStartY = doc.y;
    doc.rect(doc.page.margins.left, boxStartY - 5, pageWidth, 70).fill(COLORS.light);
    
    endorsements.forEach((e) => {
      const checkmark = e.checked ? '✓' : '○';
      const color = e.checked ? COLORS.success : COLORS.muted;
      doc.fillColor(color)
        .fontSize(9)
        .font('Helvetica')
        .text(`  ${checkmark} ${e.text}`, doc.page.margins.left + 10, doc.y + 2);
      doc.moveDown(0.5);
    });
    
    doc.y = boxStartY + 75;
  }
  
  // Follow-up Required
  if (conclusionData.followUpRequired) {
    doc.moveDown(0.5);
    doc.rect(doc.page.margins.left, doc.y - 5, pageWidth, 25).fill('#fef3c7');
    doc.fillColor('#92400e')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('  ⚠ Follow-up Audit Required', doc.page.margins.left + 10, doc.y);
    doc.moveDown(1.5);
  }
  
  // Lead Auditor Sign-off
  if (conclusionData.leadAuditorName || conclusionData.leadAuditorSignature) {
    if (doc.y > doc.page.height - 120) doc.addPage();
    
    subsectionHeader(doc, 'Lead Auditor Sign-off');
    
    const signBoxY = doc.y;
    doc.rect(doc.page.margins.left, signBoxY - 5, pageWidth, 80)
      .strokeColor(COLORS.primary)
      .lineWidth(2)
      .stroke();
    
    doc.fillColor(COLORS.muted)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Lead Auditor:', doc.page.margins.left + 15, signBoxY + 10);
    doc.fillColor(COLORS.black)
      .font('Helvetica')
      .text(conclusionData.leadAuditorName || '', doc.page.margins.left + 100, signBoxY + 10);
    
    doc.fillColor(COLORS.muted)
      .font('Helvetica-Bold')
      .text('Signature:', doc.page.margins.left + 15, signBoxY + 30);
    doc.fillColor(COLORS.black)
      .font('Helvetica-Oblique')
      .fontSize(14)
      .text(conclusionData.leadAuditorSignature || '', doc.page.margins.left + 100, signBoxY + 28);
    
    doc.fillColor(COLORS.muted)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Date:', doc.page.margins.left + 15, signBoxY + 55);
    doc.fillColor(COLORS.black)
      .font('Helvetica')
      .text(conclusionData.signatureDate ? safeFormatDate(conclusionData.signatureDate, 'dd MMMM yyyy') : '', doc.page.margins.left + 100, signBoxY + 55);
    
    doc.y = signBoxY + 90;
  }
  
  // Confidentiality Statement
  doc.moveDown(1);
  if (doc.y > doc.page.height - 100) doc.addPage();
  
  // Calculate space needed for both boxes to keep them together
  const confText = 'This audit report contains confidential information intended solely for the use of the organisation named in this report. Any distribution, copying, or disclosure of this report to third parties without the prior written consent of the certifying body is strictly prohibited.';
  const discText = 'This audit report represents the findings at the time of the audit based on the evidence available. The audit does not guarantee compliance at any other time. The organisation remains responsible for ongoing compliance with all applicable requirements.';
  
  const confHeight = doc.heightOfString(confText, { width: pageWidth - 30 }) + 50;
  const discHeight = doc.heightOfString(discText, { width: pageWidth - 30 }) + 50;
  const totalHeight = confHeight + discHeight + 20;
  const remainingSpace = doc.page.height - doc.y - doc.page.margins.bottom;
  
  // If both boxes don't fit, start new page
  if (totalHeight > remainingSpace) {
    doc.addPage();
  }
  
  drawTextBox(doc, 'Confidentiality Statement', confText, pageWidth, '#dbeafe', '#1e40af');
  doc.moveDown(0.3);
  drawTextBox(doc, 'Disclaimer', discText, pageWidth, '#fef3c7', '#92400e');
  // No moveDown after disclaimer to prevent extra blank page
}

function drawTextBox(doc: PDFKit.PDFDocument, title: string, content: string, pageWidth: number, bgColor: string, titleColor: string) {
  const textHeight = doc.heightOfString(content, { width: pageWidth - 30 });
  const boxHeight = textHeight + 45;
  const remainingSpace = doc.page.height - doc.y - doc.page.margins.bottom;
  
  // Check if box fits on current page, if not start new page
  if (boxHeight > remainingSpace) {
    doc.addPage();
  }
  
  const boxStartY = doc.y;
  
  doc.rect(doc.page.margins.left, boxStartY, pageWidth, boxHeight).fill(bgColor);
  doc.rect(doc.page.margins.left, boxStartY, pageWidth, boxHeight)
    .strokeColor(titleColor)
    .lineWidth(1)
    .stroke();
  
  doc.fillColor(titleColor)
    .fontSize(10)
    .font('Helvetica-Bold')
    .text(title, doc.page.margins.left + 15, boxStartY + 10);
  
  doc.fillColor(COLORS.black)
    .fontSize(9)
    .font('Helvetica')
    .text(content, doc.page.margins.left + 15, boxStartY + 28, { width: pageWidth - 30, align: 'justify' });
  
  doc.y = boxStartY + boxHeight;
}

function addPageNumbers(doc: PDFKit.PDFDocument) {
  const pages = doc.bufferedPageRange();
  const totalContentPages = pages.count - 1; // Exclude cover page from count
  
  // Start from page 1 (skip cover page at index 0)
  for (let i = 1; i < pages.count; i++) {
    doc.switchToPage(i);
    const pageNumber = i; // Page 1, 2, 3, etc. (cover is page 0, not numbered)
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    
    // Save current position
    const savedY = doc.y;
    
    // Draw footer line
    doc.moveTo(doc.page.margins.left, doc.page.height - 50)
      .lineTo(doc.page.width - doc.page.margins.right, doc.page.height - 50)
      .strokeColor(COLORS.light)
      .lineWidth(0.5)
      .stroke();
    
    // Add page number
    doc.font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text(
        `Page ${pageNumber} of ${totalContentPages}`,
        doc.page.margins.left,
        doc.page.height - 38,
        { width: pageWidth, align: 'center' }
      );
    
    // Restore position
    doc.y = savedY;
  }
}
