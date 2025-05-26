import { Edit, SimpleForm, TextInput } from 'react-admin';

const LocalizationEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="language" />
            <TextInput source="key" />
            <TextInput source="value" />
        </SimpleForm>
    </Edit>
);

export default LocalizationEdit; 