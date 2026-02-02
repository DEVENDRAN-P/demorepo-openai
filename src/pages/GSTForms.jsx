import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import html2pdf from 'html2pdf.js';
import Navbar from '../components/Navbar';
// eslint-disable-next-line no-unused-vars
import { getBills, migrateOldBillsKey } from '../utils/storageUtils';

function GSTForms({ user, setUser }) {
  const { t } = useTranslation();
  const [formType, setFormType] = useState('GSTR-1');
  const [gstr1Data, setGstr1Data] = useState([]);
  const [gstr3bData, setGstr3bData] = useState(null);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    // Migrate old storage format if needed
    if (user?.id) {
      migrateOldBillsKey(user.id);
    }

    const savedBills = getBills(user?.id);
    setHasData(savedBills.length > 0);

    if (savedBills.length > 0) {
      generateGSTR1(savedBills);
      generateGSTR3B(savedBills);
    }
  }, [user?.id]);

  const generateGSTR1 = (bills) => {
    const data = bills.map(bill => ({
      gstin: bill.gstin,
      supplierName: bill.supplierName,
      invoiceNumber: bill.invoiceNumber,
      invoiceDate: bill.invoiceDate,
      invoiceValue: bill.totalAmount,
      taxableValue: bill.amount,
      igst: 0,
      cgst: bill.taxAmount / 2,
      sgst: bill.taxAmount / 2,
    }));
    setGstr1Data(data);
  };

  const generateGSTR3B = (bills) => {
    const totalTaxable = bills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
    const totalTax = bills.reduce((sum, bill) => sum + (bill.taxAmount || 0), 0);
    const inputCredit = totalTax * 0.3; // Mock 30% input credit
    const netPayable = totalTax - inputCredit;

    setGstr3bData({
      outwardSupplies: totalTaxable,
      inwardSupplies: totalTaxable * 0.8,
      totalTax: totalTax,
      itc: inputCredit,
      netPayable: netPayable,
    });
  };

  const downloadPDF = () => {
    if (formType === 'GSTR-1') {
      downloadGSTR1PDF();
    } else {
      downloadGSTR3BPDF();
    }
  };

  const downloadGSTR1PDF = () => {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px;">
          <h1 style="margin: 0; font-size: 24px; color: #1e40af;">GSTR-1 Form</h1>
          <p style="margin: 5px 0; font-size: 12px; color: #666;">Outward Supplies Register</p>
          <p style="margin: 5px 0; font-size: 11px; color: #999;">Generated on ${new Date().toLocaleDateString()}</p>
        </div>

        <div style="margin-bottom: 20px; padding: 15px; background: #f3f4f6; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; font-size: 14px;">Summary</h3>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Total Entries:</strong> ${gstr1Data.length}</p>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Total Taxable Value:</strong> ₹${gstr1Data.reduce((sum, row) => sum + row.taxableValue, 0).toLocaleString()}</p>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Total Tax:</strong> ₹${(gstr1Data.reduce((sum, row) => sum + (row.cgst + row.sgst), 0)).toLocaleString()}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11px;">
          <thead>
            <tr style="background: #1e40af; color: white;">
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">GSTIN</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Supplier Name</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Invoice #</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Date</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Taxable Value</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">CGST</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">SGST</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${gstr1Data.map((row, idx) => `
              <tr style="background: ${idx % 2 === 0 ? '#fff' : '#f9fafb'}; border-bottom: 1px solid #ddd;">
                <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace;">${row.gstin}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${row.supplierName}</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #ddd; font-family: monospace;">${row.invoiceNumber}</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${new Date(row.invoiceDate).toLocaleDateString()}</td>
                <td style="padding: 8px; text-align: right; border: 1px solid #ddd; font-weight: 600;">₹${row.taxableValue.toLocaleString()}</td>
                <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">₹${row.cgst.toLocaleString()}</td>
                <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">₹${row.sgst.toLocaleString()}</td>
                <td style="padding: 8px; text-align: right; border: 1px solid #ddd; font-weight: 700; color: #1e40af;">₹${row.invoiceValue.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #666;">
          <p style="margin: 5px 0;"><strong>Note:</strong> This is a computer-generated document. No signature is required.</p>
          <p style="margin: 5px 0;">Downloaded from GST Buddy Compliance - ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = htmlContent;

    const opt = {
      margin: 10,
      filename: `GSTR-1_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
    };

    html2pdf().set(opt).from(element).save();
  };

  const downloadGSTR3BPDF = () => {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px;">
          <h1 style="margin: 0; font-size: 24px; color: #1e40af;">GSTR-3B Form</h1>
          <p style="margin: 5px 0; font-size: 12px; color: #666;">Summary Return Form</p>
          <p style="margin: 5px 0; font-size: 11px; color: #999;">Generated on ${new Date().toLocaleDateString()}</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px;">
          <div style="padding: 15px; background: #dbeafe; border: 2px solid #0284c7; border-radius: 5px;">
            <p style="margin: 0 0 5px 0; font-size: 11px; font-weight: bold; color: #0c4a6e;">OUTWARD SUPPLIES</p>
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #0c4a6e;">₹${gstr3bData.outwardSupplies.toLocaleString()}</p>
          </div>
          <div style="padding: 15px; background: #dcfce7; border: 2px solid #16a34a; border-radius: 5px;">
            <p style="margin: 0 0 5px 0; font-size: 11px; font-weight: bold; color: #15803d;">INWARD SUPPLIES</p>
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #15803d;">₹${gstr3bData.inwardSupplies.toLocaleString()}</p>
          </div>
        </div>

        <div style="margin-bottom: 20px; padding: 15px; background: #f3f4f6; border-left: 4px solid #1e40af; border-radius: 3px;">
          <h3 style="margin: 0 0 15px 0; font-size: 14px; color: #1e40af;">Tax Calculation Details</h3>
          
          <table style="width: 100%; font-size: 12px; margin-bottom: 15px;">
            <tr style="background: #e0e7ff; border-bottom: 2px solid #4f46e5;">
              <td style="padding: 10px; font-weight: bold;">Line Item</td>
              <td style="padding: 10px; text-align: right; font-weight: bold;">Amount (₹)</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;">Total Tax Liability</td>
              <td style="padding: 8px; text-align: right;">₹${gstr3bData.totalTax.toLocaleString()}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;">Input Tax Credit (ITC)</td>
              <td style="padding: 8px; text-align: right; color: #059669;">-₹${gstr3bData.itc.toLocaleString()}</td>
            </tr>
            <tr style="background: #fef3c7; border: 2px solid #f59e0b;">
              <td style="padding: 10px; font-weight: bold;">Net Payable</td>
              <td style="padding: 10px; text-align: right; font-weight: bold; font-size: 14px; color: #92400e;">₹${gstr3bData.netPayable.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div style="padding: 12px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 3px;">
            <p style="margin: 0; font-size: 11px; color: #92400e;"><strong>Effective Rate:</strong> ${((gstr3bData.netPayable / gstr3bData.outwardSupplies * 100) || 0).toFixed(2)}%</p>
          </div>
          <div style="padding: 12px; background: #ecfdf5; border-left: 4px solid #10b981; border-radius: 3px;">
            <p style="margin: 0; font-size: 11px; color: #065f46;"><strong>ITC Utilization:</strong> ${((gstr3bData.itc / gstr3bData.totalTax * 100) || 0).toFixed(2)}%</p>
          </div>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #666;">
          <p style="margin: 5px 0;"><strong>Note:</strong> This is a computer-generated document. No signature is required.</p>
          <p style="margin: 5px 0;">Downloaded from GST Buddy Compliance - ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = htmlContent;

    const opt = {
      margin: 10,
      filename: `GSTR-3B_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    html2pdf().set(opt).from(element).save();
  };

  const exportJSON = () => {
    const data = formType === 'GSTR-1' ? gstr1Data : gstr3bData;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formType}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  if (!hasData) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--neutral-50)' }}>
        <Navbar user={user} />
        <div className="container section">
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <span style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem' }}>📋</span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--neutral-900)' }}>
              No GST Forms Available
            </h2>
            <p style={{ color: 'var(--neutral-600)', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
              Upload bills first to generate GSTR-1 and GSTR-3B forms automatically.
            </p>
            <a href="/bill-upload" className="btn btn-primary btn-lg">
              Upload Bills
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--neutral-50)' }}>
      <Navbar user={user} />

      <div className="container section">
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h1 className="card-title">
              <div className="card-title-icon">📋</div>
              <span>{t('gst_forms')}</span>
            </h1>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={downloadPDF} className="btn btn-secondary btn-sm">
                <span>📥</span> {t('download_pdf')}
              </button>
              <button onClick={exportJSON} className="btn btn-secondary btn-sm">
                <span>💾</span> {t('export_json')}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setFormType('GSTR-1')}
              className={formType === 'GSTR-1' ? 'btn btn-primary' : 'btn btn-secondary'}
            >
              {t('GSTR-1')}
            </button>
            <button
              onClick={() => setFormType('GSTR-3B')}
              className={formType === 'GSTR-3B' ? 'btn btn-primary' : 'btn btn-secondary'}
            >
              {t('GSTR-3B')}
            </button>
          </div>
        </div>

        {formType === 'GSTR-1' && gstr1Data.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <div className="card-title-icon">📄</div>
                <span>{t('GSTR-1: Outward Supplies')}</span>
              </h2>
              <span className="badge badge-info">{gstr1Data.length} {t('Entries')}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>{t('GSTIN')}</th>
                    <th>{t('Supplier Name')}</th>
                    <th>{t('Invoice')}</th>
                    <th>{t('Date')}</th>
                    <th style={{ textAlign: 'right' }}>{t('Taxable Value')}</th>
                    <th style={{ textAlign: 'right' }}>{t('CGST')}</th>
                    <th style={{ textAlign: 'right' }}>{t('SGST')}</th>
                    <th style={{ textAlign: 'right' }}>{t('Total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {gstr1Data.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{row.gstin}</td>
                      <td style={{ fontWeight: 500 }}>{row.supplierName}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{row.invoiceNumber}</td>
                      <td>{new Date(row.invoiceDate).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{row.taxableValue.toLocaleString()}</td>
                      <td style={{ textAlign: 'right' }}>₹{row.cgst.toLocaleString()}</td>
                      <td style={{ textAlign: 'right' }}>₹{row.sgst.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-700)' }}>
                        ₹{row.invoiceValue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {formType === 'GSTR-3B' && gstr3bData && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <div className="card-title-icon">📝</div>
                <span>{t('GSTR-3B: Summary Return')}</span>
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="card" style={{ background: 'var(--info-light)', borderColor: '#93c5fd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e40af', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                      {t('Outward Supplies')}
                    </p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e40af' }}>
                      ₹{gstr3bData.outwardSupplies.toLocaleString()}
                    </p>
                  </div>
                  <span style={{ fontSize: '2rem' }}>📤</span>
                </div>
              </div>

              <div className="card" style={{ background: 'var(--success-light)', borderColor: '#86efac' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#166534', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                      {t('Inward Supplies')}
                    </p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#166534' }}>
                      ₹{gstr3bData.inwardSupplies.toLocaleString()}
                    </p>
                  </div>
                  <span style={{ fontSize: '2rem' }}>📥</span>
                </div>
              </div>

              <div className="card" style={{ background: 'var(--warning-light)', borderColor: '#fbbf24' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400e', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                      {t('Total Tax Liability')}
                    </p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#92400e' }}>
                      ₹{gstr3bData.totalTax.toLocaleString()}
                    </p>
                  </div>
                  <span style={{ fontSize: '2rem' }}>💰</span>
                </div>
              </div>

              <div className="card" style={{ background: 'var(--primary-50)', borderColor: 'var(--primary-200)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-700)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                      {t('Input Tax Credit (ITC)')}
                    </p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-700)' }}>
                      -₹{gstr3bData.itc.toLocaleString()}
                    </p>
                  </div>
                  <span style={{ fontSize: '2rem' }}>💳</span>
                </div>
              </div>

              <div className="card" style={{
                background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%)',
                color: 'white',
                border: 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, opacity: 0.9, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                      Net Payable
                    </p>
                    <p style={{ fontSize: '2.25rem', fontWeight: 800 }}>
                      ₹{gstr3bData.netPayable.toLocaleString()}
                    </p>
                  </div>
                  <span style={{ fontSize: '3rem' }}>💸</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GSTForms;
