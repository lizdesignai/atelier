// src/components/admin/CuradoriaDocument.tsx
import React from "react";

interface CuradoriaDocumentProps {
  adminRefs: any[];
  projectName: string;
}

export default function CuradoriaDocument({ adminRefs, projectName }: CuradoriaDocumentProps) {
  if (!adminRefs || adminRefs.length === 0) return null;

  return (
    <div 
      id="pdf-curadoria-render-clean" 
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
          Relatório de Curadoria
        </h1>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '4px', color: '#8c562e', fontWeight: 'bold', margin: 0 }}>
          {projectName}
        </p>
      </div>

      {/* ROTAS CRIATIVAS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '50px' }}>
        {adminRefs.map((ref, i) => {
          const images = ref.image_urls && ref.image_urls.length > 0 ? ref.image_urls : (ref.image_url ? [ref.image_url] : []);
          
          return (
            <div key={i} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              {/* Título da Direção */}
              <h2 style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '26px', fontWeight: 'normal', borderBottom: '1px solid #e5e5e5', paddingBottom: '15px', margin: '0 0 25px 0', color: '#1a1a1a' }}>
                <span style={{ color: '#8c562e', marginRight: '10px' }}>{String(i + 1).padStart(2, '0')}.</span>
                {ref.title}
              </h2>
              
              {/* Galeria de Imagens */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
                {images.map((img: string, idx: number) => (
                  <div key={idx} style={{ width: '100%', height: '250px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #eeeeee' }}>
                     <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={`Referência ${idx + 1}`}/>
                  </div>
                ))}
              </div>
              
              {/* Caixa de Avaliação */}
              <div style={{ backgroundColor: '#fcfaf8', padding: '25px', borderRadius: '12px', border: '1px solid #f0e6dd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #f0e6dd', paddingBottom: '10px' }}>
                   <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: '#8c562e', fontWeight: 'bold' }}>
                     Feedback do Cliente
                   </span>
                   <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1a1a1a', backgroundColor: '#ffffff', padding: '4px 12px', borderRadius: '20px', border: '1px solid #e5e5e5' }}>
                     Nota: {ref.score || 0}/10
                   </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', color: '#999999', marginBottom: '4px' }}>Atmosfera Global</span>
                    <p style={{ fontSize: '12px', lineHeight: '1.5', margin: '0', color: '#333333' }}>{ref.feedback?.q1 || "Aguardando avaliação"}</p>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', color: '#999999', marginBottom: '4px' }}>Tipografia</span>
                    <p style={{ fontSize: '12px', lineHeight: '1.5', margin: '0', color: '#333333' }}>{ref.feedback?.q2 || "Aguardando avaliação"}</p>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', color: '#999999', marginBottom: '4px' }}>Cores e Tons</span>
                    <p style={{ fontSize: '12px', lineHeight: '1.5', margin: '0', color: '#333333' }}>{ref.feedback?.q3 || "Aguardando avaliação"}</p>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', color: '#999999', marginBottom: '4px' }}>Elementos Gráficos</span>
                    <p style={{ fontSize: '12px', lineHeight: '1.5', margin: '0', color: '#333333' }}>{ref.feedback?.q4 || "Aguardando avaliação"}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* RODAPÉ */}
      <div style={{ marginTop: '60px', paddingTop: '20px', borderTop: '1px solid #e5e5e5', textAlign: 'center' }}>
        <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: '#999999' }}>Atelier Liz Design • Relatório Confidencial de Curadoria</p>
      </div>
    </div>
  );
}