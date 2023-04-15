export interface Provider {
    /** Provider Name */
    provider_name: string;
    /** Provider UUID */
    provider_uuid: string;
    /** Consortium Name */
    consortium_name: string;
    /** Defaults: thumbnail technology */
    defaults: string;
    /** An array of Donor */
    donors: Donor[]
}

export interface Donor {
    /** id of the Donor */
    id: string;
    /** label of the Donor */
    label: string;
    /** descripton of the Donor */
    descripton: string;
    /** link of the Donor */
    link: string;
    /** Age of the Donor */
    age: number;
    /** Sex of the Donor */
    sex: string;
    /** BMI of the Donor */
    bmi: number;
    /** An array of Block */
    blocks: Block[];
}

export interface Block {
    /** id of the Section item */
    id: string;
    /** RUI Location of Section item */
    rui_location: string;
    /** label of the Section item */
    label: string;
    /** descripton of the Section item */
    descripton: string;
    /** link of the Section item */
    link: string;
    /** Section Count */
    section_count: number;
    /** Section size of the Section item*/
    section_size: number;
    /** section unit of the Section item*/
    section_unit: string;
    /** An array of Section */
    sections: Section[]
    /** An array of Dataset */
    datasets: DataSet[]
}

export interface Section {
    /** id of the Section item */
    id: string;
    /** label of the Section item */
    label: string;
    /** descripton of the Section item */
    descripton: string;
    /** link of the Section item */
    link: string;
    /** Section number of the Section item */
    section_number: number;
}

export interface DataSet {
    /** id of the Dataset item */
    id: string;
    /** label of the Dataset item */
    label: string;
    /** descripton of the Dataset item */
    descripton: string;
    /** link of the Dataset item */
    link: string;
    /** technology of the Dataset item */
    technology: string;
    /** thumbnail of the Dataset item */
    thumbnail: string
}
