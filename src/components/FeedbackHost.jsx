import { useEffect, useState } from "react";
import ConfirmModal from "./ConfirmModal";
export default function FeedbackHost(){
 const [alert,setAlert]=useState(null);
 useEffect(()=>{const h=e=>setAlert(e.detail);window.addEventListener("noorie:alert",h);return()=>window.removeEventListener("noorie:alert",h)},[]);
 return <ConfirmModal open={Boolean(alert)} title={alert?.title||"Notice"} message={alert?.message||""} confirmText="Okay" showCancel={false} danger={false} onConfirm={()=>setAlert(null)} onClose={()=>setAlert(null)}/>;
}
