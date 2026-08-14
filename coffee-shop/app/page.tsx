

export default function Home(){
  return(
    <main className="min-h-screen bg-[#fffef0]">

      <div  className="mx-auto max-w-[1550px] overflow-hidden rounded-2xl bg-[#fffef0]">
        {/* navbar ke design me included */}

    
        <section className="px-5 pb-8 pt-16 text-center sm:px-8 sm:pb-10 sm:pt-16 md:pt-20 lg:pt-24">
          <h1 className="mx-auto
          max-w-5xl font-[family-name:var(--font-playfair)]
          text-5xl font-medium leading-[0.9] tracking-[-0.045em]drop-shadow-[0_2px_8px_rgba(75,46,31,0.08)] text-[#4b2e1f] sm:text-6xl md:text-7xl lg:text-[86px]"> start your day
          <br/>
 with a perfect cup of coffee</h1>


 <p
  className="
    mx-auto
    mt-8
    max-w-3xl
    text-base
    leading-7
    text-[#806e5d]
    sm:text-lg
    sm:leading-8
    md:text-[18px]
  "
>
  Fresh beans brewed daily for a smooth, rich taste. Made for busy
            mornings and quick breaks ordered ahead and pick up your cup right
            on time.
 </p>
  


        {/* coffee time pic */}


        <div className=" mt-10  grid grid-cols-2 gap-1 overflow-hidden lg:h-[430px] lg:grid-cols-4 lg:gap-2 lg:grid-cols-[0.9fr_1.6fr_1.5fr_1.6fr_0.9fr] ">
          <div className="h-[220px] overflow-hidden rounded-r-[35px] sm:h-[280px] md:h-[330px] lg:h-auto lg:rounded-r-[55px]">
            <img src="/coffee4.jpg"
            alt="coffee"
            className="h-full w-full object-cover"/>
            </div>

            {/* // image 2 pic */}
            <div className="h-[220px] overflow-hidden rounded-b-[35px] sm:h-[280px] md:h-[330px] lg:h-auto lg:rounded-b-[55px]">
              <img src="/coffee2.jpg"
              alt="coffee"
              className="h-full w-full object-cover"
              />
              </div>
            
{/* i quotess */}
          <div className="col-span-2 flex min-h-[220px] items-center justify-center rounded-[35px] bg-[#4b2b22] px-6 py-10 text-center   shadow-[0_12px_30px_rgba(75,43,34,0.12)]
          sm:min-h-[280px] md:min-h-[330px] lg:col-span-1 lg:min-h-0 lg:rounded-[50px] lg:px-10 lg:py-16">
          <p
                className="
                  max-w-[250px]
                  font-[family-name:var(--font-playfair)]
                  text-xl
                  leading-tight
                  text-[#fffef0]

                  sm:text-2xl
                  md:text-3xl
                "
              >
                Every cup is made to wake you up, warm you up, and keep you
                moving.
              </p>
            </div>
 <div
              className="
                h-[220px]
                overflow-hidden
                rounded-b-[35px]

                sm:h-[280px]
                md:h-[330px]

                lg:h-auto
                lg:rounded-b-[45px]
              "
            >
              <img
                src="/coffee1.jpg"
                alt="Cold coffee"
                className="h-full w-full object-cover"
              />
            </div>
 <div
              className="
                h-[220px]
                overflow-hidden
                rounded-l-[35px]

                sm:h-[280px]
                md:h-[330px]

                lg:h-auto
                lg:rounded-l-[45px]
              "
            >
              <img
                src="/coffee2.jpg"
                alt="Coffee cup"
                className="h-full w-full object-cover"
              />
            </div>
        </div>
        </section>
    
      </div>
    </main>
  );
}