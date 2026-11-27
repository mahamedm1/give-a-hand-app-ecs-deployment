variable "domain_name" {
  type        = string
  description = "Name for the Domain"
}

variable "acm_certificate_name" {
  type        = string
  description = "Name for the ACM certification"
}

variable "validation_method" {
  type        = string
  description = "Method to validate ACM certificate"
}

variable "zone_name" {
  type        = string
  description = "Name of our Route53 zone"
}

