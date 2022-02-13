## 4.2.0

* attr/EnumSet
    - fix sorting of enumeration sources
* base/Grouping
    - inherit some options from parents
* calc/CalcToken
    - fix logical calculated expression
* calc/CalcQuery
    - add calculated attribute to a chain of nested expression attributes
* model/ModelRelated
    - limit single link query
    - protect a linked object from deletion
* validator/EnumValidator
    - fix validation queryable enumerations
* validator/JsonValidator
    - keep parsed JSON
* validator/UniqueValidator
    - validate uniqueness on ancestors

## 4.1.0

* update names of condition operators

## 4.0.0

* behavior/DataHistoryBehavior
    - add state history to model
* calc/CalcToken
    - add empty and not empty operators
* condition/Condition
    - fix condition solver
* validator/NumberValidator
    - ignore useless leading or trailing zeros

## 3.0.0

* base/ClassBehaviors
    - refactor behavior component
* behavior/FileBehavior
    - override raw file model
    - store file hash
* behavior/S3Behavior
    - add S3 storage behavior
* behavior/SignatureBehavior
    - add digital signature behavior
* validator/TotalFileSizeValidator
    - add total file size validation to relation
* validator/Validator
    - validate entire model without target attributes

## 2.1.0

* base/Class
    - add hierarchical class versions
* source/BaseSource
    - fix data sources

## 2.0.0

* use optional chaining
* validator/RangeValidator
    - rename range property to values
* validator/StringValidator
    - shrink spaces

## 1.8.0

* base/View
    - extract query creation method
* behavior/Behavior
    - move event emitting to model
* calc/CalcToken
    - add master value
* filter/RelationFilter
    - fix format of arguments
* model/Model
    - clear errors before deleting
    - add master model getter

## 1.7.0

* calc/CalcToken
    - add logical operations
* validator/ConditionValidator
    - add condition validator