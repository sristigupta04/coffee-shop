

type Active = {
    id:string;
    title:string;
    description:string;
    time:string;
    date:string;
}


type Group ={
    title:string;
    activities:Active[];
}



export default function Activegrp({
    title,
    activities
}:Group){
 



    if(activities.length === 0){
        return null;
    }

    return (
        <section className="mb-3 text-lg font-semibold">

            <h2  className="mb-3 text-lg font-semibold">
                {title}
            </h2>



            <div className="mt-2 overflow-hidden rounded-2xl bg-white shadow-sm">


 {activities.map((act)=>(
    <div 
       key ={act.id}

       className="flex items-center justify-between gap-4 border-b border-[#3e2416]/20 p-4 last:border-b-0">
<div className="flex items-center gap-4">

       <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eadbc9] text-[#6f472f]">
         dot
        </div>



<div>
    <h3 className="text-sm font-medium text-[#3e2416]">{act.title}</h3>
    <p className="text-sm text-[#3e2416]/70">{act.description}</p>
    </div>
    </div>

    <span className="text-sm text-[#3e2416]/70">
        {act.time}
        </span>
</div>
 ))}
            </div>
        </section>
    );

}