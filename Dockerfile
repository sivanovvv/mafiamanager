FROM php:8.3-apache-bookworm

RUN apt-get update && apt-get install -y \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    libpng-dev \
    libicu-dev \
    libzip-dev \
    libgmp-dev \
    libonig-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
       gd intl zip exif gmp mysqli pdo_mysql bcmath opcache mbstring \
    && rm -rf /var/lib/apt/lists/*

RUN a2enmod rewrite headers \
    && printf '%s\n' \
       '<Directory /var/www/html>' \
       'AllowOverride All' \
       'Require all granted' \
       '</Directory>' \
       > /etc/apache2/conf-available/invision.conf \
    && a2enconf invision

WORKDIR /var/www/html
