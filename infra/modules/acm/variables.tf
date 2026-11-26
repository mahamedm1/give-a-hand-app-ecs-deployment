variable "domain_name" {
    type = string
    description = "Name for the Domain"
}

variable "aws_acm_certificate_name" {
    type = string
    description = "Name for the ACM certification"
}

variable "var.validation_method" {
    type = string
    description = "Method to validate ACM certificate"
}


