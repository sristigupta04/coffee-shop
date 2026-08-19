
"use client";
import {useState} from 'react';

type Security ={
    id: number;
    name: string;
}
type Session ={
    id:number;
    device: string;
    browser: string;
    location: string;
    lastActive: string;
    current: boolean;

}

type login={
    id:number;
    device: string;
    location: string;
    date: string;
    status: string;
}

export default function SecurityPage() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    const [towfactor, setTwoFactor] = useState('');
    const [alerts ,setalerts] = useState('');
    const[session , setsession] = useState<Session[]>([
        {
            id: 1,
            device: 'iPhone 12',
            browser: 'Safari',
            location: 'New York, USA',
            lastActive: '2023-06-01 10:30 AM',
            current: true,
        },
        {
            id:2,
            device: 'MacBook Pro',
            browser: 'Chrome',
            location: 'Los Angeles, USA',
            lastActive: '2023-06-01 09:15 AM',
            current: false,
        }
    ]);

const [login] = useState<login[]>([
{
    id:1,
    device: 'iPhone 12',
    location: 'New York, USA',
    date: '2023-06-01 10:30 AM',
    status: 'Successful',
},{
    id:2,
    device: 'MacBook Pro',
    location: 'Los Angeles, USA',
    date: '2023-06-01 09:15 AM',
    status: 'Failed',
}
]);
const [ secure] = useState<Security[]>([
    {
        id:1,
        name: 'Change Password',
    },
    {   
        id:2,
        name: 'Two-Factor Authentication',
    },
]);

    const passwordchange = () =>{

        setPasswordError('');
        setPasswordSuccess('');
        if(!currentPassword || !newPassword || !confirmPassword){
            setPasswordError('Please fill in all fields');
            return;
        }
        if(newPassword.length < 8){
            setPasswordError('Password must be at least 8 characters long');
            return;
        }
        if(newPassword !== confirmPassword){
            setPasswordError('Passwords do not match');
            return;
        }
        setPasswordSuccess('Password changed successfully');

        setCurrentPassword('');
        setConfirmPassword('');
        setNewPassword("");


    };

        const twofactorauth =()=>{
            setTwoFactor((prev) => (prev === 'enabled' ? 'disabled' : 'enabled'));
        }
           const logout = (id:number)=>{
            setsession((prevSessions) => prevSessions.filter((session) => session.id !== id));
           }
           const logoutall =() =>{
            setsession((prevSessions) => prevSessions.filter((session) => !session.current));
           }

    



        return(
            <main className="min-h-screen bg-[#f7f1e8] px-4 py-10 text-[#3e2723]">

                <div className="mx-auto max-w-4xl">

                    <div className="mb-8">
                    <h1 className="text-3xl font-bold">
                        Security Settings
                    </h1>
                    <p className="mt-2 text-sm text-[#795548]">
                        Manage your account security settings, including password changes, two-factor authentication, and session management.
                    </p>
                    </div>


                    {/* secuirty status  */}
                    <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

                        <div className="flex items-center jusitfy-between">
                            <div>
                                <h1 className="text-xl font-semibold">Account Security</h1>
                                <p className="mt-2 text-sm text-gray-600">Your account is secure and settings are up to date.</p>
                            </div>
                            <div className="rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-800">Secure</div>

                        </div>
                    </section>












                    {/* security options  */}
                    <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

                        <h2 className="text-lg font-semibold mb-4">Security Options</h2>
                        <div className="space-y-3">
                            {secure.map((option) => (
                                <div key={option.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                                    <span className="text-sm font-medium">{option.name}</span>
                                    <button className="rounded-md bg-blue-500 px-3 py-1 text-sm font-medium text-white hover:bg-blue-600">Manage</button>
                                </div>
                            ))}
                        </div>
                    </section>


                    {/* change password */}
                    <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4">Change Password</h2>
                        <div className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
                            <input type="password" placeholder="Current Password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="border border-gray-300 rounded-md p-2 mb-4" />
                            <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="border border-gray-300 rounded-md p-2 mb-4" />
                            <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="border border-gray-300 rounded-md p-2 mb-4" />
                            {passwordError && <p className="text-red-500">{passwordError}</p>}
                            {passwordSuccess && <p className="text-green-500">{passwordSuccess}</p>}
                                <button onClick={passwordchange} className="bg-blue-500 text-white rounded-md p-2">Change Password</button>
                            </div>
                    
                    </section>
                    {/* two factor authentication */}


                    <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Two-Factor Authentication</h2>
                            <button onClick={twofactorauth} className={`rounded-md px-3 py-1 text-sm font-medium ${towfactor === 'enabled' ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'}`}>
                                {towfactor === 'enabled' ? 'Enabled' : 'Disabled'}
                            </button>
                        </div>
                        {towfactor === 'enabled' ? (
                            <p className="text-sm text-gray-600">Two-factor authentication is currently enabled for your account.</p>
                        ) : (
                            <p className="text-sm text-gray-600">Two-factor authentication is currently disabled for your account. Enable it for added security.</p>
                        )}
                    </section>

                    {/* active sessions */}


                    <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">

                        <h2 className="text-lg font-semibold mb-4">Active Sessions</h2>
                        <p className="text-lg font-semibold">Active Sessions</p>
                        <p className="mt-2 text-sm text-gray-600">Manage your active sessions and log out from devices you no longer use.</p>
                        <button onClick={logoutall} className="rounded-md bg-red-500 px-3 py-1 text-sm font-medium text-white hover:bg-red-600">Logout All</button>
                        </div>

                        <div className="space-y-3">
                            {session.map((session) => (

                                <div
                                 key={session.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                                    <div>
                                        <h3 className="text-sm font-medium">{session.device}</h3>
                                        <p className="text-xs text-gray-500">{session.browser}</p>
                                        <p className="text-xs text-gray-500">{session.location}</p>
                                        <p className="text-xs text-gray-500">Last Active: {session.lastActive}</p>
                                    </div>

                                    {session.current ? (
                                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-700">Current Device</span>
                                    ) : (
                                        <button onClick={() => logout(session.id)} className="rounded-md border border-red-500 px-4 py-2 text-sm text-red-600">Logout</button>
                                    )}
                                </div>
        
            ))}

    
                        
            </div>
        </section>

        {/* LOGIN ACTIVITY */}

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-semibold">
            Login Activity
          </h2>

          <div className="mt-5 space-y-3">

            {login.map((item) => (

              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
              >

                <div>

                  <h3 className="font-medium">
                    {item.device}
                  </h3>

                  <p className="text-sm text-gray-600">
                    {item.location}
                  </p>

                  <p className="text-xs text-gray-500">
                    {item.date}
                  </p>

                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    item.status === "Successful"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {item.status}
                </span>

              </div>

            ))}

          </div>

        </section>

        {/* SECURITY ALERTS */}

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between">

            <div>
              <h2 className="text-lg font-semibold">
                Security Alerts
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                Receive notifications about suspicious activity.
              </p>
            </div>

            <button
onClick={() => setalerts(alerts === "on" ? "off" : "on")}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                alerts === "on"
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {alerts === "on" ? "On" : "Off"}
            </button>

          </div>

        </section>

      </div>

    </main>
  );
}