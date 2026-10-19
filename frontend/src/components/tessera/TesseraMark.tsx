// src/components/tessera/TesseraMark.tsx
import React from 'react';
import VeronnaSymbol from '../brand/VeronnaSymbol';

interface TesseraMarkProps {
  size?: number | string;
  className?: string;
  fillColor?: string;
}

/**
 * Emblema oficial do Tessera integrado ao Studio Veronna.
 * Utiliza o símbolo oficial e histórico do estúdio (VeronnaSymbol / Ativo 19).
 */
export const TesseraMark: React.FC<TesseraMarkProps> = ({
  size = 20,
  className = '',
  fillColor = 'currentColor',
  ...props
}) => {
  return <VeronnaSymbol size={size} className={className} fillColor={fillColor} {...props} />;
};

export default TesseraMark;
