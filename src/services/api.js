

const LICENSE_BASE_URL = "https://raw.githubusercontent.com/spdx/license-list-data/main/json/licenses.json"

export const getLicenses = async () => {
    const response = await fetch(LICENSE_BASE_URL);
    const data = await response.json();

    return data.licenses;
};