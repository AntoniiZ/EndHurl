import mongoose from 'mongoose'
const country/**: mongoose.SchemaDefinitionProperty<CountryInterface>*/ = new mongoose.Schema({
    name : {
        type: String,
    }
})

export default mongoose.model("Country", country);
