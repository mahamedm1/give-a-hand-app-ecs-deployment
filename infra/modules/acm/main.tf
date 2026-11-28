resource "aws_acm_certificate" "certificate" {
  domain_name       = var.domain_name
  validation_method = var.validation_method

  tags = {
    Name = var.acm_certificate_name
  }
}

resource "aws_route53_zone" "dev" {
  name    = var.domain_name

  tags = {
    Name = var.zone_name
  }
}

resource "aws_route53_record" "dns" {
  name            = one(aws_acm_certificate.certificate.domain_validation_options).resource_record_name
  records         = [one(aws_acm_certificate.certificate.domain_validation_options).resource_record_value]
  type            = one(aws_acm_certificate.certificate.domain_validation_options).resource_record_type
  allow_overwrite = true
  ttl             = 60
  zone_id = aws_route53_zone.dev.id
}

resource "aws_acm_certificate_validation" "validation" {
  certificate_arn         = aws_acm_certificate.certificate.arn
  validation_record_fqdns = [aws_route53_record.dns.fqdn]
}

resource "aws_lb_listener" "listener" {

  certificate_arn = aws_acm_certificate_validation.validation.certificate_arn
}

