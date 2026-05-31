import { useState } from 'react';

const PASSWORD = '1qaz2wsx';

export default function PasswordLock({ title, subtitle, onUnlock }) {
  const [input, setInput]   = useState('');
  const [error, setError]   = useState('');
  const [show, setShow]     = useState(false);

  function attempt() {
    if (input === PASSWORD) {
      setError('');
      onUnlock();
    } else {
      setError('Incorrect password. Try again.');
      setInput('');
    }
  }

  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh'}}>
      <div style={{background:'var(--color-background-primary, #fff)',border:'1px solid var(--border, #e8e8e6)',borderRadius:12,padding:'32px 36px',width:360,maxWidth:'95vw',textAlign:'center'}}>
        <div style={{width:56,height:56,borderRadius:'50%',background:'#E6F1FB',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
          <i className="ti ti-lock" style={{fontSize:24,color:'#185FA5'}} aria-hidden="true" />
        </div>
        <div style={{fontSize:18,fontWeight:500,color:'var(--text, #1a1a1a)',marginBottom:6}}>{title}</div>
        <div style={{fontSize:12,color:'var(--text2, #666)',marginBottom:24}}>{subtitle}</div>
        <div style={{position:'relative',marginBottom:12}}>
          <input
            type={show ? 'text' : 'password'}
            value={input}
            placeholder="Enter password"
            autoFocus
            onChange={function(e){setInput(e.target.value);setError('');}}
            onKeyDown={function(e){if(e.key==='Enter')attempt();}}
            style={{width:'100%',fontSize:14,padding:'10px 40px 10px 14px',border:'1px solid '+(error?'#E24B4A':'var(--border2, #ddd)'),borderRadius:8,background:'var(--input-bg, #f5f5f3)',color:'var(--text, #1a1a1a)',outline:'none',fontFamily:'inherit'}}
          />
          <button
            onClick={function(){setShow(function(s){return !s;});}}
            style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text2, #666)',padding:4}}>
            <i className={show ? 'ti ti-eye-off' : 'ti ti-eye'} style={{fontSize:16}} aria-hidden="true" />
          </button>
        </div>
        {error && <div style={{fontSize:12,color:'#E24B4A',marginBottom:12}}>{error}</div>}
        <button
          onClick={attempt}
          style={{width:'100%',padding:'10px',background:'#378ADD',color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
          Unlock
        </button>
        <div style={{fontSize:11,color:'var(--text2, #666)',marginTop:16,opacity:.7}}>
          This page is password protected
        </div>
      </div>
    </div>
  );
}
