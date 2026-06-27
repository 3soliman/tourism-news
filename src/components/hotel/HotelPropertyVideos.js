import React from 'react';
import { getVideoEmbed } from '../../utils/videoEmbed';

const HotelPropertyVideos = ({ videoUrl, title, embedTitle }) => {
  const embed = getVideoEmbed(videoUrl);

  if (!embed) return null;

  return (
    <section className="detail-section detail-section--videos">
      {title ? <h2>{title}</h2> : null}
      <div className="detail-videos">
        <div className="detail-video-embed">
          <iframe
            src={embed.embedUrl}
            title={embedTitle || 'Property video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
};

export default HotelPropertyVideos;
