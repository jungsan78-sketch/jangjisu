import { useEffect, useState } from 'react';

export default function Page() {
  const [data,setData] = useState({shorts:[],videos:[]});

  useEffect(()=>{
    fetch('/api/youtube')
    .then(r=>r.json())
    .then(setData)
  },[])

  return (
    <div style={{padding:40,color:"white",background:"#000"}}>

      <h1>장지수 본채널 롱폼 영상</h1>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>
        {data.videos.map(v=>(
          <a key={v.id} href={v.url} target="_blank">
            <img src={v.thumbnail} style={{width:"100%"}}/>
            <p>{v.title}</p>
          </a>
        ))}
      </div>

      <h1 style={{marginTop:50}}>Shorts</h1>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:20}}>
        {data.shorts.map(v=>(
          <a key={v.id} href={`https://www.youtube.com/shorts/${v.id}`} target="_blank">
            <img src={v.thumbnail} style={{width:"100%"}}/>
            <p>{v.title}</p>
          </a>
        ))}
      </div>

    </div>
  )
}
