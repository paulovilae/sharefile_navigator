import { Create, SimpleForm, TextInput } from 'react-admin';

const LocalizationCreate = () => (
    <Create>
        <SimpleForm>
            <TextInput source="language" />
            <TextInput source="key" />
            <TextInput source="value" />
        </SimpleForm>
    </Create>
);

export default LocalizationCreate; 