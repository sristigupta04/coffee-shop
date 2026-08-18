

type Offer ={
    id:number;
    name:string;
    description:string;
    discount:number;
    applied:boolean;
    code:string;
}


type Props = {
    offer: Offer;
    onApply: (offerId: number) => void;
    onCopyCode: (code: string) => void;
}



export default function Offer({ offer, onApply, onCopyCode }: Props) {
    return (
        <div >
            <h2 className="text-lg font-semibold">{offer.name}</h2> 
            <p className="mt-2 text-sm text-[#6B7280]">{offer.description}</p>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-[#f7f7f7] p-4">
                <span className="text-xl font-bold text-[#3B82F6]">${offer.discount.toFixed(2)}</span>
                <button 
                    onClick={() => onApply(offer.id)}
                    className="rounded-lg bg-[#3B82F6] text-white hover:bg-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    Apply
                </button>
            </div>
            <button type="button" onClick={() => onCopyCode(offer.code)} className="mt-2 text-sm text-[#3B82F6] hover:underline">
                Copy Code
            </button>


            <button type="button" onClick={()=>onApply(offer.id)} className={`mt-2 text-sm text-[#3B82F6] hover:underline ${
            offer.applied ? "bg-green-500 text-white" : "bg-gray-200 text-gray-700"
    }`}
    >

                {offer.applied ? "Applied" : "Apply Offer"}
                Apply Offer
            </button>


        </div>
    )

}