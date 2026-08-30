import React from 'react';
import { X, Microscope, ScanLine, Calculator, ServerCrash, ScanEye, Download } from 'lucide-react';
import TargaChip from './TargaChip';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formattaDataOra } from '../utils/formatta';
import toast from 'react-hot-toast';

// Fallback in caso la variabile d'ambiente non sia caricata
const URL_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const Dato = ({ etichetta, valore }) => (
  <div>
    <p className="occhiello">{etichetta}</p>
    <p className="font-mono text-lg mt-1 tabular-nums">{valore}</p>
  </div>
);

const Riepilogo = ({ accesso, onClose }) => {

  if (!accesso) return null;

  const haImmagini = accesso.frame_path || accesso.bbox_path || accesso.crop_path;

  const scaricaReport = async () => {
    const idToast = toast.loading('Generazione report PDF aziendale in corso...');
    
    try {
      const doc = new jsPDF();
      
      // 1. INTESTAZIONE DOCUMENTO
      doc.setFontSize(22);
      doc.setTextColor(41, 128, 185); // Blu elegante
      doc.text('Report Diagnostico Rilevazione ANPR', 14, 20);
      
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generato il: ${formattaDataOra(new Date().toISOString())}`, 14, 28);

      // 2. TABELLA METADATI
      const esitoStr = accesso.esito === 'TARGA_NON_RILEVATA' ? 'FALLITO' : 'SUCCESSO';
      const confidenzaStr = accesso.confidenza ? (accesso.confidenza * 100).toFixed(1) + '%' : 'N/A';

      autoTable(doc, {
        startY: 35,
        head: [['Data e Ora', 'Targa Letta', 'Sorgente', 'Esito', 'Confidenza OCR']],
        body: [[
          formattaDataOra(accesso.creato_at), 
          accesso.targa_letta || 'Nessuna', 
          accesso.sorgente.toUpperCase(), 
          esitoStr,
          confidenzaStr
        ]],
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 11, halign: 'center' }
      });

      let currentY = doc.lastAutoTable.finalY + 15;

      // 3. SEZIONE IMMAGINI (se presenti)
      if (haImmagini) {
        doc.setFontSize(16);
        doc.setTextColor(41, 128, 185);
        doc.text('Analisi Visiva YOLOv8 e PaddleOCR', 14, currentY);
        currentY += 10;

        // Funzione invisibile per scaricare l'immagine come stringa Base64
        const getBase64Image = async (url) => {
          const res = await fetch(url);
          const blob = await res.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        };

        // Inserimento Bounding Box
        if (accesso.bbox_path) {
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
          doc.text('Frame annotato dal modello Object Detection:', 14, currentY);
          currentY += 5;

          const bboxUrl = `${URL_BASE}/api/images/${accesso.bbox_path}?t=${Date.now()}`;
          const base64Bbox = await getBase64Image(bboxUrl);
          
          // Impagina la foto grande (180x101 mm, proporzioni 16:9)
          doc.addImage(base64Bbox, 'JPEG', 14, currentY, 180, 101);
          currentY += 110;
        }

        // Inserimento Ritaglio Targa (Crop)
        if (accesso.crop_path) {
          // Se stiamo per uscire fuori dal foglio A4, creiamo una nuova pagina
          if (currentY > 240) {
            doc.addPage();
            currentY = 20;
          }
          
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
          doc.text("Ritaglio isolato passato in pasto all'OCR:", 14, currentY);
          currentY += 5;

          const cropUrl = `${URL_BASE}/api/images/${accesso.crop_path}?t=${Date.now()}`;
          const base64Crop = await getBase64Image(cropUrl);
          
          // Impagina il crop più piccolo (80x25 mm)
          doc.addImage(base64Crop, 'JPEG', 14, currentY, 80, 25);
        }
      }

      // 4. SALVATAGGIO
      doc.save(`Report_${accesso.targa_letta || 'Manuale'}_${Date.now()}.pdf`);
      toast.success('Report PDF professionale scaricato!', { id: idToast });

    } catch (err) {
      console.error("Errore esportazione PDF nativo:", err);
      toast.error('Errore durante la generazione del documento.', { id: idToast });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-asfalto/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-quadro border border-tratteggio rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        
        {/* Header Modale */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-tratteggio sticky top-0 bg-quadro/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <Microscope className="w-5 h-5 text-banda" />
            <h2 className="font-display font-bold text-xl">Dettaglio Rilevazione</h2>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={scaricaReport}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-banda/20 text-targa hover:bg-banda/30 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" /> Esporta PDF
            </button>

            <button 
              onClick={onClose}
              className="p-2 rounded-md hover:bg-tratteggio text-nebbia hover:text-targa transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
        </div>

        {/* Corpo Modale */}
        <div className="p-6 space-y-8">
          
          {/* Sezione 1: Metadati */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 bg-asfalto/50 p-5 rounded-md border border-tratteggio/50">
            <Dato etichetta="Data e Ora" valore={formattaDataOra(accesso.creato_at)} />
            <Dato etichetta="Sorgente" valore={accesso.sorgente.toUpperCase()} />
            <Dato 
              etichetta="Esito Varco" 
              valore={accesso.esito === 'TARGA_NON_RILEVATA' ? 'FALLITO' : 'SUCCESSO'} 
            />
            <div>
              <p className="occhiello">Targa Registrata</p>
              <div className="mt-1">
                <TargaChip targa={accesso.targa_letta} dimensione="sm" />
              </div>
            </div>
          </div>

          {/* Sezione 2: Statistiche OCR */}
          {accesso.confidenza !== null && (
            <div>
              <p className="flex items-center gap-2 occhiello mb-4">
                <Calculator className="w-4 h-4" /> Statistiche Pipeline
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                <Dato 
                  etichetta="Confidenza Media" 
                  valore={`${(accesso.confidenza * 100).toFixed(1)}%`} 
                />
                <Dato 
                  etichetta="Voto di Maggioranza" 
                  valore={`${accesso.occorrenze} / ${accesso.letture_totali}`} 
                />
                <Dato 
                  etichetta="Modello" 
                  valore="PaddleOCR (CPU)" 
                />
              </div>
            </div>
          )}

          {accesso.candidati_json && (
            <div className="mt-6 border-t border-tratteggio pt-6">
              <p className="flex items-center gap-2 occhiello mb-4">
                <ScanEye className="w-4 h-4" /> Letture OCR
              </p>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {JSON.parse(accesso.candidati_json).map((cand, idx) => (
                  <div key={cand.targa} className="flex flex-col items-start bg-asfalto p-3 rounded border border-tratteggio">
                    <span className="text-xs text-nebbia mb-1">Opzione {idx + 1}</span>
                    <TargaChip targa={cand.targa} dimensione="sm" />
                    <span className="text-xs mt-2 text-nebbia">
                    Confidenza: {(cand.confidenza * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sezione 3: Immagini (Computer Vision) */}
          {haImmagini ? (
            <div>
              <p className="flex items-center gap-2 occhiello mb-4">
                <ScanLine className="w-4 h-4" /> Analisi Visiva
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                {accesso.bbox_path && (
                  <div className="space-y-2">
                    <p className="text-sm text-nebbia">Frame annotato (Bounding Box)</p>
                    <img
                      src={`${URL_BASE}/api/images/${accesso.bbox_path}`} 
                      alt="Bounding Box"
                      className="w-full rounded border border-tratteggio bg-black object-contain aspect-video"
                    />
                  </div>
                )}
                
                {accesso.crop_path && (
                  <div className="space-y-2">
                    <p className="text-sm text-nebbia">Ritaglio passato all'OCR</p>
                    <div className="w-full aspect-video flex items-center justify-center p-8 bg-asfalto rounded border border-tratteggio border-dashed">
                      <img
                        src={`${URL_BASE}/api/images/${accesso.crop_path}`} 
                        alt="Crop Targa"
                        className="max-w-full max-h-32 rounded shadow-md object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-nebbia p-6 bg-asfalto/50 rounded-md border border-tratteggio border-dashed">
              <ServerCrash className="w-5 h-5" />
              <p className="text-sm">Nessuna immagine disponibile per questo transito (inserimento manuale).</p>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

export default Riepilogo;