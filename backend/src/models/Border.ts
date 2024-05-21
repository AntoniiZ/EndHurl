import mongoose from 'mongoose'
const border/**: mongoose.SchemaDefinitionProperty<BorderInterface>*/ = new mongoose.Schema({
    point : {
        type: Array,
    },
    countryName: {
        type: String
    },
    mapName: {
        type: String
    }
})
//border.index({ mapName: 1 })
export default mongoose.model("Border", border);

