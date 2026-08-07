import { useState } from "react";
type Form = {
    email:string,
    password:string
}
export default function Login(){
    const [form,formdata]= useState<Form>({email:"",password:""});
       const [loading,setLoading]=useState(false);
  
const handleChange = async(e:React.FormEvent)=>{
    e.preventDefault()
    if(form.email== "" || form.password == ""){
        console.log("logged");
        alert("please fill the box");
        return;
    }
    setLoading(true);

    try{
const res = await fetch("http://localhost:3000/api/login",{
    method:"post",
    headers:{
        "content-type":"application/json"
    },
    body:JSON.stringify(form)
})
const data = await res.json();
if(data.success){
    window.location.href = "/dashboard";
}else{
    alert("Invalid credentials");
}
}catch(err){
    alert("Something went wrong");
}finally{
    setLoading(false);
}
}

return(
    <div>
    <div>

 <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form
        onSubmit={handleChange}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg"
      >
        <h1 className="mb-6 text-center text-3xl font-bold">
          Login
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) =>
            formdata({ ...form, email: e.target.value })
          }
          className="mb-4 w-full rounded-md border p-3"
        />

        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) =>
            formdata({ ...form, password: e.target.value })
          }
          className="mb-6 w-full rounded-md border p-3"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-orange-500 py-3 text-white hover:bg-orange-600 disabled:bg-gray-400"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  </div>

    </div>
)
    }
