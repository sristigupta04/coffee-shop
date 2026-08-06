type Prop ={
    label: string;
    type:String;
    placeholder:string;
    value :string;
    onChange:(newValue:string)=>void;
}
export default function Input({label,type,placeholder,value,onChange}:Prop){
    return(
        <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>

            
            <input 
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            />
        </div>
    )
}