export const QUESTION_SECONDS = 20;

// Photos are zoomed crops from Wikimedia Commons (CC licenses). Keep the credit with each photo.
export const QUESTIONS = [
  { prompt: "Name this car from the back.", image: "/images/trivia/q01.webp", credit: "Berthold Werner, CC BY-SA 4.0, cropped", options: ["Lotus Esprit", "DeLorean DMC-12", "Pontiac Fiero", "Fiat X1/9"], answer: 1 },
  { prompt: "Which one is NOT a real car?", image: null, options: ["Mazda Bongo", "Honda Wiggler", "Nissan Cedric", "Subaru Sambar"], answer: 1 },
  { prompt: "Name this car from the side.", image: "/images/trivia/q03.webp", credit: "Guywelch2000, CC BY 4.0, cropped", options: ["Lamborghini Jalpa", "Ferrari 308 GTB", "Lamborghini Countach", "Ferrari Testarossa"], answer: 3 },
  { prompt: "A very controversial taillight. Name the car.", image: "/images/trivia/q04.webp", credit: "Cutlass, CC0, cropped", options: ["Chrysler PT Cruiser", "Nissan Juke", "Pontiac Aztek", "Suzuki X-90"], answer: 2 },
  { prompt: "Mitsubishi sells the Pajero as the Montero in Spanish-speaking markets. Why?", image: null, options: ["Pajero is rude slang in Spanish", "The name was already trademarked", "Montero tested better in India", "Pajero means slow in Spanish"], answer: 0 },
  { prompt: "Two sets of headlights. Name this car.", image: "/images/trivia/q06.webp", credit: "Rudolf Stricker, CC BY-SA 3.0, cropped", options: ["Fiat Multipla", "Citroën C3 Picasso", "Renault Avantime", "Fiat Panda"], answer: 0 },
  { prompt: "Check the door and the fender vents. Name this car.", image: "/images/trivia/q07.webp", credit: "Sicnag, CC BY 2.0, cropped", options: ["Mazda RX-7", "Nissan 350Z", "Mazda RX-8", "Mitsubishi Eclipse"], answer: 2 },
  { prompt: "How do you say Porsche correctly?", image: null, options: ["Porsh, one syllable", "POR-shuh, two syllables", "Por-sheh-ay", "Pors-ch"], answer: 1 },
  { prompt: "Where did the door go? Name this car.", image: "/images/trivia/q09.webp", credit: "Mr.choppers, CC BY-SA 4.0, cropped", options: ["Porsche 914", "BMW Z1", "Mazda MX-5 NA", "Lotus Elan"], answer: 1 },
  { prompt: "What is the first thing someone says at every car meet?", image: null, options: ["Is that stock?", "Nice weather today", "Can I pet your car?", "What is the gas mileage?"], answer: 0 },
];
