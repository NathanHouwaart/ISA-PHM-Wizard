import React from 'react';


function ProfilePicture({image, altText, width = 100, height = 100}) {
    return (
        <img className='profile-basic' src={image} alt={altText} width={width} height={height}/>
    );
}

export default ProfilePicture;