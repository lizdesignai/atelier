// src/components/admin/BriefingDocument.tsx
import React from "react";

interface BriefingDocumentProps {
  clientBriefing: any;
  projectName: string;
}

export default function BriefingDocument({ clientBriefing, projectName }: BriefingDocumentProps) {
  if (!clientBriefing) return null;

  return (
    <div 
      id="pdf-briefing-render-clean" 
      style={{ 
        width: '800px', 
        padding: '60px 50px', 
        backgroundColor: '#ffffff', 
        color: '#1a1a1a', 
        fontFamily: 'Arial, Helvetica, sans-serif' 
      }}
    >
      {/* CAPA / CABEÇALHO EDITORIAL */}
      <div style={{ textAlign: 'center', marginBottom: '50px', borderBottom: '1px solid #e5e5e5', paddingBottom: '40px' }}>
        <img 
          src="/images/simbolo-rosa.png" 
          alt="Atelier" 
          style={{ width: '60px', height: '60px', objectFit: 'contain', opacity: 0.3, margin: '0 auto 20px auto', display: 'block' }} 
        />
        <h1 style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '38px', fontWeight: 'normal', margin: '0 0 10px 0', color: '#1a1a1a' }}>
          Dossiê Estratégico
        </h1>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '4px', color: '#8c562e', fontWeight: 'bold', margin: 0 }}>
          {projectName}
        </p>
      </div>

      {/* CONTEÚDO MAPEADO COM DESIGN EDITORIAL */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {Object.entries(clientBriefing).map(([key, val]: any) => {
          // Ignora campos vazios ou URLs puras que não sejam relevantes para o texto
          if (!val || key === 'logo_atual_url') return null;

          return (
            <div key={key} style={{ pageBreakInside: 'avoid', breakInside: 'avoid', backgroundColor: '#fafafa', padding: '25px', borderRadius: '12px', borderLeft: '3px solid #8c562e' }}>
              <span style={{ 
                display: 'block', 
                fontSize: '10px', 
                textTransform: 'uppercase', 
                letterSpacing: '2px', 
                color: '#8c562e', 
                fontWeight: 'bold', 
                marginBottom: '10px' 
              }}>
                {key.replace(/_/g, ' ')}
              </span>
              <p style={{ 
                fontSize: '14px', 
                lineHeight: '1.8', 
                margin: '0', 
                color: '#333333', 
                whiteSpace: 'pre-wrap' 
              }}>
                {String(val)}
              </p>
            </div>
          );
        })}

        {/* ANEXO VISUAL SE EXISTIR */}
        {clientBriefing.logo_atual_url && (
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid', marginTop: '20px', padding: '25px', border: '1px solid #e5e5e5', borderRadius: '12px' }}>
             <span style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: '#8c562e', fontWeight: 'bold', marginBottom: '15px' }}>
                Logotipo Anterior (Anexo)
              </span>
              <img src={clientBriefing.logo_atual_url} alt="Logo Anterior" style={{ maxWidth: '300px', borderRadius: '8px', border: '1px solid #eeeeee' }} />
          </div>
        )}
      </div>

      {/* RODAPÉ */}
      <div style={{ marginTop: '60px', paddingTop: '20px', borderTop: '1px solid #e5e5e5', textAlign: 'center' }}>
        <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: '#999999' }}>Atelier Liz Design • Documento Estratégico Confidencial</p>
      </div>
    </div>
  );
}