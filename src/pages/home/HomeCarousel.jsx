// src/pages/home/HomeCarousel.jsx
// Swiper carousel. Landscape images fill (cover). Portrait images show fully (contain + bg sides).

import { useState } from 'react';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import './HomeCarousel.css';

function CarouselImage({ src, alt }) {
  const [portrait, setPortrait] = useState(false);

  return (
    <img
      src={src}
      alt={alt}
      className={`hp-carousel__img${portrait ? ' hp-carousel__img--portrait' : ''}`}
      onLoad={e => {
        const { naturalWidth, naturalHeight } = e.currentTarget;
        setPortrait(naturalHeight > naturalWidth);
      }}
    />
  );
}

export function HomeCarousel({ images, altPrefix = '' }) {
  if (!images?.length) return null;

  const single = images.length === 1;

  return (
    <Swiper
      modules={[Autoplay, Navigation, Pagination]}
      autoplay={single ? false : { delay: 4000, disableOnInteraction: false, pauseOnMouseEnter: true }}
      navigation={!single}
      pagination={single ? false : { clickable: true }}
      loop={!single}
      grabCursor={true}
      slidesPerView={1}
      speed={450}
      className="hp-carousel"
      aria-label={altPrefix ? `תמונות — ${altPrefix}` : 'תמונות'}
    >
      {images.map((src, i) => (
        <SwiperSlide key={i}>
          <CarouselImage
            src={src}
            alt={altPrefix ? `${altPrefix}, תמונה ${i + 1}` : `תמונה ${i + 1}`}
          />
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
