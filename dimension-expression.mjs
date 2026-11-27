// Safe arithmetic parser for CAD dimension expressions. No eval/Function.
export function evaluateDimensionExpression(source) {
  const input=String(source??'').trim().replace(/,/g,'.');
  if(!input) throw new Error('Escribe una medida.');
  let index=0;
  const skip=()=>{while(/\s/.test(input[index]||''))index++;};
  const number=()=>{
    skip(); const start=index; let dots=0;
    while(index<input.length && /[0-9.]/.test(input[index])) {if(input[index]==='.')dots++;if(dots>1)throw new Error('Número decimal inválido.');index++;}
    if(start===index)throw new Error('Se esperaba un número.');
    const value=Number(input.slice(start,index));
    if(!Number.isFinite(value))throw new Error('Número no válido.');
    return value;
  };
  const factor=()=>{
    skip(); const ch=input[index];
    if(ch==='+'||ch==='-'){index++;const v=factor();return ch==='-'?-v:v;}
    if(ch==='('){index++;const v=expression();skip();if(input[index]!==')')throw new Error('Falta cerrar el paréntesis.');index++;return v;}
    return number();
  };
  const term=()=>{let value=factor();while(true){skip();const op=input[index];if(op!=='*'&&op!=='/')break;index++;const rhs=factor();if(op==='/'&&Math.abs(rhs)<Number.EPSILON)throw new Error('No se puede dividir entre cero.');value=op==='*'?value*rhs:value/rhs;if(!Number.isFinite(value))throw new Error('El resultado no es finito.');}return value;};
  const expression=()=>{let value=term();while(true){skip();const op=input[index];if(op!=='+'&&op!=='-')break;index++;const rhs=term();value=op==='+'?value+rhs:value-rhs;if(!Number.isFinite(value))throw new Error('El resultado no es finito.');}return value;};
  const result=expression();skip();if(index!==input.length)throw new Error('Expresión no válida.');return result;
}
